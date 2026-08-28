import json
import unittest
from ais_relay import AISRelayService, map_ais_type_to_category


class TestAISRelay(unittest.TestCase):
    def setUp(self):
        self.service = AISRelayService(socketio_instance=None)

    def test_category_mapping(self):
        # None / missing -> Pending
        self.assertEqual(map_ais_type_to_category(None), "Pending")
        self.assertEqual(map_ais_type_to_category("INVALID"), "Pending")

        # 80-89: Tanker
        self.assertEqual(map_ais_type_to_category(80), "Tanker")
        self.assertEqual(map_ais_type_to_category(89), "Tanker")
        self.assertEqual(map_ais_type_to_category("84"), "Tanker")

        # 70-79: Cargo
        self.assertEqual(map_ais_type_to_category(70), "Cargo")
        self.assertEqual(map_ais_type_to_category(79), "Cargo")

        # 60-69: Passenger
        self.assertEqual(map_ais_type_to_category(60), "Passenger")
        self.assertEqual(map_ais_type_to_category(65), "Passenger")

        # 30: Fishing
        self.assertEqual(map_ais_type_to_category(30), "Fishing")

        # Specific other valid numeric types (52 = Tug, 31 = Towing, etc.)
        self.assertEqual(map_ais_type_to_category(52), "Other")

    def test_process_position_report_pending_state(self):
        pos_msg = json.dumps({
            "MessageType": "PositionReport",
            "MetaData": {
                "MMSI": 419999888,
                "ShipName": "OCEAN EXPLORER",
                "latitude": 18.5,
                "longitude": 72.8,
                "time_utc": "2026-08-27 00:00:00"
            },
            "Message": {
                "PositionReport": {
                    "UserID": 419999888,
                    "Latitude": 18.5,
                    "Longitude": 72.8,
                    "Sog": 15.3,
                    "Cog": 240.5,
                    "TrueHeading": 240
                }
            }
        })
        self.service._process_message(pos_msg)
        ship = self.service.get_ship("419999888")
        self.assertIsNotNone(ship)
        self.assertEqual(ship["name"], "OCEAN EXPLORER")
        self.assertEqual(ship["lat"], 18.5)
        self.assertEqual(ship["lon"], 72.8)
        self.assertEqual(ship["sog"], 15.3)
        self.assertEqual(ship["cog"], 240.5)
        self.assertEqual(ship["ship_type"], "Pending")  # Must be Pending before ShipStaticData
        self.assertEqual(len(ship["history"]), 1)

    def test_process_ship_static_data_merge(self):
        # 1. Position arrives first
        pos_msg = json.dumps({
            "MessageType": "PositionReport",
            "MetaData": {"MMSI": 419111222, "latitude": 12.0, "longitude": 75.0},
            "Message": {
                "PositionReport": {
                    "Latitude": 12.0,
                    "Longitude": 75.0,
                    "Sog": 10.0,
                    "Cog": 90.0
                }
            }
        })
        self.service._process_message(pos_msg)

        # 2. Static data arrives second
        static_msg = json.dumps({
            "MessageType": "ShipStaticData",
            "MetaData": {"MMSI": 419111222},
            "Message": {
                "ShipStaticData": {
                    "Name": "KERALA STAR",
                    "Type": 80,
                    "Destination": "COCHIN",
                    "CallSign": "AWXZ"
                }
            }
        })
        self.service._process_message(static_msg)

        # Check merged record
        ship = self.service.get_ship("419111222")
        self.assertIsNotNone(ship)
        self.assertEqual(ship["name"], "KERALA STAR")
        self.assertEqual(ship["ship_type"], "Tanker")
        self.assertEqual(ship["destination"], "COCHIN")
        self.assertEqual(ship["lat"], 12.0)
        self.assertEqual(ship["sog"], 10.0)
        self.assertEqual(ship["cog"], 90.0)

    def test_dynamic_sector_change(self):
        res = self.service.change_sector("MUMBAI_GUJARAT")
        self.assertEqual(res["preset"], "MUMBAI_GUJARAT")
        self.assertEqual(self.service.selected_preset_key, "MUMBAI_GUJARAT")
        self.assertEqual(len(self.service.get_all_ships()), 0)


if __name__ == "__main__":
    unittest.main()
