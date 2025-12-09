from django.shortcuts import render
from rest_framework import generics
from rest_framework.response import Response
from math import radians, sin, cos, sqrt, atan2

from .models import Station
from .serializers import StationSerializer


# -------------------------
# Haversine distance helper
# -------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # metres
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    d_lat = lat2 - lat1
    d_lon = lon2 - lon1

    a = sin(d_lat/2)**2 + cos(lat1)*cos(lat2)*sin(d_lon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))

    return R * c  # distance in metres


# -------------------------
# List all stations
# -------------------------
class StationList(generics.ListAPIView):
    queryset = Station.objects.all()
    serializer_class = StationSerializer


# -------------------------
# Nearby station search
# -------------------------
class NearbyStations(generics.ListAPIView):
    serializer_class = StationSerializer

    def get_queryset(self):
        try:
            lat = float(self.request.query_params.get("lat"))
            lon = float(self.request.query_params.get("lon"))
        except (TypeError, ValueError):
            return Station.objects.none()

        radius = float(self.request.query_params.get("radius", 5000))

        stations = Station.objects.all()
        results = []

        for s in stations:
            d = haversine(lat, lon, s.latitude, s.longitude)
            if d <= radius:
                s.distance = d
                results.append(s)

        # Sort by closest first
        return sorted(results, key=lambda x: x.distance)


# -------------------------
# Map HTML page
# -------------------------
def map_page(request):
    return render(request, "stations/map.html")
