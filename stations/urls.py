from django.urls import path
from django.http import HttpResponse
from .views import (
    stations_geojson,
    NearbyStations,
    OSM_POI,
    OpenChargeEV,
    map_page,
)

def health(request):
    return HttpResponse("ok")

urlpatterns = [
    path("stations/", stations_geojson),
    path("stations/nearby/", NearbyStations.as_view()),
    path("pois/", OSM_POI.as_view()),
    path("ev/", OpenChargeEV.as_view()),
    path("health/", health),
    path("map/", map_page),
]
