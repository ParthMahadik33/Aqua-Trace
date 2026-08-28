import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("AISSTREAM_API_KEY", "b79e39478b16c6c3044f3025ef2e743996deadaa")

# Malacca Strait bounding box
MALACCA_BOX = [[[1.0, 99.5], [6.0, 104.5]]]

async def test_stream():
    url = "wss://stream.aisstream.io/v0/stream"
    sub_msg = {
        "APIKey": API_KEY,
        "BoundingBoxes": MALACCA_BOX,
        "FilterMessageTypes": ["PositionReport", "ShipStaticData", "StandardClassBPositionReport", "StaticDataReport", "ExtendedClassBPositionReport"]
    }
    print(f"Connecting to {url} with BoundingBoxes: {MALACCA_BOX}")
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps(sub_msg))
        print("Subscription sent! Listening for packets in Malacca Strait...")
        count = 0
        async for msg in ws:
            data = json.loads(msg)
            mtype = data.get("MessageType")
            mmsi = data.get("MetaData", {}).get("MMSI")
            name = data.get("MetaData", {}).get("ShipName", "").strip()
            body = data.get("Message", {})
            print(f"[{count+1}] MessageType: {mtype} | MMSI: {mmsi} | Name: '{name}'")
            
            # Print static data payload details if static
            if mtype in ("ShipStaticData", "StaticDataReport") or "ShipStaticData" in body or "StaticDataReport" in body:
                print(f"   >>> STATIC DETAILS: {json.dumps(body)}")
                
            count += 1
            if count >= 15:
                break

if __name__ == "__main__":
    asyncio.run(test_stream())
