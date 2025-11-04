from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from .models import Station
from .serializers import StationGeoSerializer
from django.shortcuts import render


# viewset for Station model
class StationViewSet(viewsets.ModelViewSet):
    queryset = Station.objects.all()# details ordered by id
    serializer_class =  StationGeoSerializer
    filterset_fields = ["station_type"]
    search_fields = ["name"]


    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        from .serializers import StationGeoSerializer
        serializer = StationGeoSerializer(qs, many=True)
        print("Serializer output:", serializer.data)
        return Response(serializer.data)


    # Custom action to get nearest stations to a given point (lat, lon) 
    def _user_point(self, request):
        lat = float(request.GET.get("lat", 53.349805))  # Default to Dublin latitude
        lon = float(request.GET.get("lon", -6.26031))   # Default to Dublin longitude
        return Point(lon, lat, srid=4326)
        
    @action(detail=False, methods=["get"])
    def nearby(self, request):
        radius = float(request.GET.get("radius", 5000)) # in meters
        user_pt = self._user_point(request)
        qs = (
            Station.objects
            .annotate(distance=Distance("geom", user_pt))
            .filter(distance__lte=radius)
            .order_by("distance")
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
    
    # api/stations/nearest/?lat=..&lon=..&radius=..
    @action(detail=False, methods=["get"])
    def cheapest(self, request):
        radius = float(request.GET.get("radius", 5000)) # in meters
        user_pt = self._user_point(request)
        qs = (
            Station.objects
            .annotate(distance=Distance("geom", user_pt))
            .filter(distance__lte=radius)
            .order_by("fuel_price", "distance")
        )
        return Response(StationGeoSerializer(qs, many=True).data)
# Map page view
def map_page(request):
    return render(request, "stations/map.html")
    

    
    