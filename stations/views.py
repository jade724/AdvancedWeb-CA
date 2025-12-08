from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.shortcuts import render

from .models import Station
from .serializers import StationGeoSerializer


class StationViewSet(viewsets.ModelViewSet):
    """
    Main API for stations.

    Base endpoints:
      - GET    /api/stations/           -> all stations (FeatureCollection)
      - POST   /api/stations/           -> create
      - GET    /api/stations/<id>/      -> detail
      - PUT    /api/stations/<id>/      -> update
      - PATCH  /api/stations/<id>/      -> partial update
      - DELETE /api/stations/<id>/      -> delete

    Extra endpoints:
      - GET /api/stations/nearby/?lat=..&lon=..&radius=5000
      - GET /api/stations/cheapest/?lat=..&lon=..&radius=5000
    """
    queryset = Station.objects.all().order_by("id")
    serializer_class = StationGeoSerializer

    # IMPORTANT: no pagination so the API returns a single FeatureCollection
    pagination_class = None

    # Simple text search + ordering if used from DRF UI
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["fuel_price", "updated_at", "name"]

    def _user_point(self, request):
        """
        Read lat/lon from the query parameters.
        Defaults to Dublin city centre if not supplied.
        """
        lat = float(request.GET.get("lat", 53.3498))
        lon = float(request.GET.get("lon", -6.2603))
        return Point(lon, lat, srid=4326)

    # --------------------------------------------------
    # Nearby stations within a radius (in metres)
    # --------------------------------------------------
    @action(detail=False, methods=["get"])
    def nearby(self, request):
        """
        GET /api/stations/nearby/?lat=..&lon=..&radius=5000

        Returns stations as a GeoJSON FeatureCollection,
        ordered by distance (closest first).
        """
        radius = float(request.GET.get("radius", 5000))
        user_pt = self._user_point(request)

        qs = (
            Station.objects
            .annotate(distance=Distance("geom", user_pt))
            .filter(distance__lte=radius)
            .order_by("distance")
        )

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    # --------------------------------------------------
    # Cheapest stations within a radius
    # --------------------------------------------------
    @action(detail=False, methods=["get"])
    def cheapest(self, request):
        """
        GET /api/stations/cheapest/?lat=..&lon=..&radius=5000

        Returns stations as a GeoJSON FeatureCollection,
        ordered by price (cheapest first, then by distance).
        """
        radius = float(request.GET.get("radius", 5000))
        user_pt = self._user_point(request)

        qs = (
            Station.objects
            .annotate(distance=Distance("geom", user_pt))
            .filter(distance__lte=radius)
            .order_by("fuel_price", "distance")
        )

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


def map_page(request):
    """
    Renders the main Leaflet map page.
    """
    return render(request, "stations/map.html")
