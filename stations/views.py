# views.py
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Station
from django.conf import settings
from django.db.models import F
import requests
import json
from math import radians, sin, cos, sqrt, atan2


# -----------------------------------------------------
# Helper: Haversine distance (meters)
# -----------------------------------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    d_lat = lat2 - lat1
    d_lon = lon2 - lon1

    a = sin(d_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(d_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


# -----------------------------------------------------
# 1. GeoJSON output for all stations
# -----------------------------------------------------
def stations_geojson(request):
    stations = Station.objects.all()

    features = []
    for s in stations:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [s.longitude, s.latitude],
            },
            "properties": {
                "id": s.id,
                "name": s.name,
                "station_type": s.station_type,
                "fuel_price": str(s.fuel_price),
                "updated_at": s.updated_at.isoformat(),
            },
        })

    return JsonResponse({"type": "FeatureCollection", "features": features})


# -----------------------------------------------------
# 2. Nearby station filtering
# -----------------------------------------------------
class NearbyStations(APIView):
    def get(self, request):
        try:
            lat = float(request.GET.get("lat"))
            lon = float(request.GET.get("lon"))
            radius = float(request.GET.get("radius", 5000))
        except:
            return Response({"error": "Missing or invalid parameters"}, status=400)

        items = []
        for s in Station.objects.all():
            d = haversine(lat, lon, s.latitude, s.longitude)
            if d <= radius:
                items.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]},
                    "properties": {
                        "id": s.id,
                        "name": s.name,
                        "station_type": s.station_type,
                        "fuel_price": str(s.fuel_price),
                        "distance_m": d,
                    },
                })

        items.sort(key=lambda x: x["properties"]["distance_m"])

        return Response({
            "type": "FeatureCollection",
            "features": items
        })


# -----------------------------------------------------
# 3. NEW — Overpass API POI Lookup
# -----------------------------------------------------
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OSM_AMENITIES = [
    "cafe", "restaurant", "pub", "fast_food",
    "parking", "fuel", "atm", "supermarket",
    "charging_station"
]

class OSM_POI(APIView):
    def get(self, request):
        try:
            lat = float(request.GET.get("lat"))
            lon = float(request.GET.get("lon"))
        except:
            return Response({"error": "lat/lon required"}, status=400)

        query = f"""
        [out:json];
        (
          node(around:5000,{lat},{lon})["amenity"];
        );
        out center;
        """

        r = requests.post(OVERPASS_URL, data=query)
        data = r.json()

        pois = []
        for el in data.get("elements", []):
            if el.get("tags", {}).get("amenity") in OSM_AMENITIES:
                pois.append({
                    "name": el["tags"].get("name", "Unnamed"),
                    "amenity": el["tags"].get("amenity"),
                    "lat": el.get("lat"),
                    "lon": el.get("lon"),
                })

        return Response({"results": pois})


# -----------------------------------------------------
# 4. NEW — EV Chargers (OpenChargeMap)
# -----------------------------------------------------
class OpenChargeEV(APIView):
    def get(self, request):
        lat = request.GET.get("lat")
        lon = request.GET.get("lon")

        url = (
            "https://api.openchargemap.io/v3/poi/?output=json"
            f"&latitude={lat}&longitude={lon}&distance=5&distanceunit=KM"
        )

        r = requests.get(url)
        data = r.json()

        results = []
        for item in data:
            info = item.get("AddressInfo", {})
            results.append({
                "name": info.get("Title"),
                "lat": info.get("Latitude"),
                "lon": info.get("Longitude"),
                "address": info.get("AddressLine1"),
            })

        return Response({"results": results})


# -----------------------------------------------------
# 5. Front-end page
# -----------------------------------------------------
def map_page(request):
    return render(request, "stations/map.html")
