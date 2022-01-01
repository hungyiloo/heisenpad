use futures_util::{SinkExt, StreamExt, TryFutureExt};
use std::{
    collections::HashMap,
    io::Error as IoError,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
};
use tokio::sync::{mpsc, RwLock};
use tokio_stream::wrappers::UnboundedReceiverStream;
use warp::{
    ws::{Message, WebSocket},
    Filter,
};

/// Our global unique user id counter.
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

type User = (String, usize);

/// Our state of currently connected users.
///
/// - Key is their id
/// - Value is a sender of `warp::ws::Message`
type Users = Arc<RwLock<HashMap<User, mpsc::UnboundedSender<Message>>>>;

#[tokio::main]
async fn main() -> Result<(), IoError> {
    // Keep track of all connected users, key is usize, value
    // is a websocket sender.
    let users = Users::default();
    // Turn our "state" into a new Filter...
    let users = warp::any().map(move || users.clone());

    let ws = warp::path!("ws" / String)
        // The `ws()` filter will prepare the Websocket handshake.
        .and(users)
        .and(warp::ws())
        .map(
            |channel: String, users, ws: warp::ws::Ws| {
                // This will call our function if the handshake succeeds.
                ws.on_upgrade(move |socket| user_connected(socket, channel, users))
            },
        );

    let static_dir = warp::path("static").and(warp::fs::dir("static"));

    let other = warp::fs::file("static/index.html");

    let routes = static_dir.or(ws).or(other);

    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;

    Ok(())
}

async fn user_connected(ws: WebSocket, my_channel: String, users: Users) {
    // Use a counter to assign a new unique ID for this user.
    let my_id = NEXT_USER_ID.fetch_add(1, Ordering::Relaxed);

    eprintln!("new chat user: {}", my_id);

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
    let user = (my_channel.clone(), my_id);
    users.write().await.insert(user.clone(), tx);

    // Return a `Future` that is basically a state machine managing
    // this specific user's connection.

    // Every time the user sends a message, broadcast it to
    // all other users...
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(uid={}): {}", my_id, e);
                break;
            }
        };
        user_message(&user, msg, &users).await;
    }

    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(&user, &users).await;
}

async fn user_message(me: &User, msg: Message, users: &Users) {
    // Skip any non-Text messages...
    let msg = if let Ok(s) = msg.to_str() {
        s
    } else {
        return;
    };

    // New message from this user, send it to everyone else (except same uid)...
    let (my_channel, my_id) = me;
    for ((channel, uid), tx) in users.read().await.iter() {
        if my_id != uid && my_channel == channel {
            if let Err(_disconnected) = tx.send(Message::text(msg.clone())) {
                // The tx is disconnected, our `user_disconnected` code
                // should be happening in another task, nothing more to
                // do here.
            }
        }
    }
}

async fn user_disconnected(me: &User, users: &Users) {
    eprintln!("good bye user: {:?}", me);

    // Stream closed up, so remove from the user list
    users.write().await.remove(me);
}
