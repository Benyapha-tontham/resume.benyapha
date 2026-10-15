# Benyapha Tontham

The portfolio is available at `/`. The read-only room availability dashboard is available at `/rooms` or `/room-dashboard.html`.

## Run the room dashboard

Install Node.js 18 or newer, then run this from the project folder:

```powershell
node server.js
```

Open `http://localhost:8080` on the computer running the server. To open it from a phone or Core2 on the same Wi-Fi, use the computer's local network address, for example `http://192.168.1.20:8080`. Allow Node.js through Windows Defender Firewall on a **Private** network if prompted. Keep the server running while the dashboard is in use.

The first run creates `data/rooms.json`; room status and update timestamps are saved there and survive server restarts. The default room IDs are `room-101`, `room-102`, `room-201`, and `room-202`. Change the `INITIAL_ROOMS` list in `server.js` to set up different rooms before the first run. A room is shown as offline if its device has not reported in the last 45 seconds. Set `ROOM_OFFLINE_AFTER_MS` to change that timeout (for example, `60000` for one minute).

## Connect an M5Stack Core2 with UIFlow 2

Connect the Core2 and the computer running the server to the same Wi-Fi network. In UIFlow 2, connect to Wi-Fi using the network setup available in your project, then run this MicroPython example. Replace the Wi-Fi credentials and server address. Set the reported state from the room sensor or booking logic; `available` and `occupied` are the only accepted states.

```python
import json
import network
import time
import urequests

WIFI_NAME = "your-wifi-name"
WIFI_PASSWORD = "your-wifi-password"
SERVER_IP = "192.168.1.20"  # Computer running node server.js
ROOM_ID = "room-101"

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(WIFI_NAME, WIFI_PASSWORD)
while not wlan.isconnected():
    time.sleep(1)

while True:
    # Replace this example value with the room's actual availability.
    status = "available"
    url = "http://{}:8080/api/rooms/{}".format(SERVER_IP, ROOM_ID)
    payload = json.dumps({"status": status})
    response = None
    try:
        if not wlan.isconnected():
            wlan.connect(WIFI_NAME, WIFI_PASSWORD)
            while not wlan.isconnected():
                time.sleep(1)
        response = urequests.post(
            url,
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        print(response.status_code, response.text)
    except Exception as error:
        print("Room update failed:", error)
    finally:
        if response is not None:
            response.close()
    time.sleep(15)
```

The Core2 sends status updates using `POST /api/rooms/{room-id}` with a JSON body such as `{"status":"available"}`. The web page polls `GET /api/rooms` every five seconds. The API reports availability only; it has no device-control, door, or lock commands. It has no authentication, so use it only on a trusted private network.
