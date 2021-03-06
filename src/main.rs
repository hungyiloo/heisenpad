use futures_util::{SinkExt, StreamExt, TryFutureExt};
use rust_embed::RustEmbed;
use std::{collections::HashMap, io::Error as IoError, net::SocketAddr, sync::Arc};
use tokio::sync::{mpsc, RwLock};
use tokio_stream::wrappers::UnboundedReceiverStream;
use warp::{
    http::HeaderValue,
    path::Tail,
    reply::Response,
    ws::{Message, WebSocket},
    Filter, Rejection, Reply,
};

type User = (String, SocketAddr);
type Users = Arc<RwLock<HashMap<User, mpsc::UnboundedSender<Message>>>>;

#[tokio::main]
async fn main() -> Result<(), IoError> {
    let users = Users::default();
    // Turn our "state" into a new Filter...
    let users = warp::any().map(move || users.clone());

    let ws = warp::path!("ws" / String)
        // The `ws()` filter will prepare the Websocket handshake.
        .and(warp::addr::remote())
        .and(users)
        .and(warp::ws())
        .map(
            |channel: String, remote: Option<SocketAddr>, users, ws: warp::ws::Ws| {
                let addr = remote.unwrap();
                ws.on_upgrade(move |socket| user_connected(socket, (channel, addr), users))
            },
        );

    let static_files = warp::path::tail().and_then(serve_frontend_tail);

    let other = warp::path::end().and_then(serve_frontend_index);

    let routes = ws.or(static_files).or(other);

    warp::serve(routes).run(([127, 0, 0, 1], 9002)).await;

    Ok(())
}

async fn user_connected(ws: WebSocket, user: User, users: Users) {
    // eprintln!("hello user: {:?}", user);

    // Split the socket into a sender and receive of messages.
    let (mut user_ws_tx, mut user_ws_rx) = ws.split();

    // Use an unbounded channel to handle buffering and flushing of messages
    // to the websocket...
    let (tx, rx) = mpsc::unbounded_channel();
    let mut rx = UnboundedReceiverStream::new(rx);

    tokio::task::spawn(async move {
        while let Some(message) = rx.next().await {
            user_ws_tx
                .send(message)
                .unwrap_or_else(|e| {
                    eprintln!("websocket send error: {}", e);
                })
                .await;
        }
    });

    // Save the sender in our list of connected users.
    users.write().await.insert(user.clone(), tx.clone());

    // Return a `Future` that is basically a state machine managing
    // this specific user's connection.

    // Every time the user sends a message, broadcast it to
    // all other users...
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(user={:?}): {}", user, e);
                break;
            }
        };
        user_broadcast(&user, &tx, msg, &users).await;
    }

    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(&user, &users).await;
}

async fn user_broadcast(user: &User, user_tx: &mpsc::UnboundedSender<Message>, msg: Message, users: &Users) {
    // Skip any non-Text messages...
    let msg_json = if let Ok(s) = msg.to_str() { s } else { return };
    let msg: serde_json::Value = if let Ok(v) = serde_json::from_str(msg_json) { v } else { return };
    let command = match &msg["command"] {
        serde_json::Value::String(c) => c,
        _ => { return }
    };

    match command.as_ref() {
        "ping" => {
            let _ = user_tx.send(Message::text(msg_json.clone()));
            // errors are handled elsewhere
        },
        _ =>  {
            // New message from this user, send it to everyone else (except same uid)...
            let (my_channel, _) = user;
            for ((channel, _), tx) in users.read().await.iter() {
                if my_channel == channel {
                    let _ = tx.send(Message::text(msg_json.clone()));
                    // errors are handled elsewhere
                }
            }
        }
    }

}

async fn user_disconnected(user: &User, users: &Users) {
    // eprintln!("good bye user: {:?}", user);

    // Stream closed up, so remove from the user list
    users.write().await.remove(user);
}

const FRONTEND_ENTRYPOINT: &str = "index.html";

async fn serve_frontend_index() -> Result<impl Reply, Rejection> {
    return serve_frontend(FRONTEND_ENTRYPOINT).await;
}

async fn serve_frontend_tail(tail: Tail) -> Result<impl Reply, Rejection> {
    return match serve_frontend(tail.as_str()).await {
        Ok(r) => Ok(r),
        Err(_) => serve_frontend(FRONTEND_ENTRYPOINT).await,
    };
}

async fn serve_frontend(path: &str) -> Result<impl Reply, Rejection> {
    let asset = FrontEnd::get(path).ok_or_else(warp::reject::not_found)?;
    let mime = mime_guess::from_path(path).first_or_octet_stream();
    let mut res = Response::new(asset.data.into());
    res.headers_mut().insert(
        "content-type",
        HeaderValue::from_str(mime.as_ref()).unwrap(),
    );
    Ok(res)
}

#[derive(RustEmbed)]
#[folder = "ui/build"]
struct FrontEnd;
