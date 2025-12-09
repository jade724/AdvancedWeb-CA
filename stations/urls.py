from django.urls import path
from django.http import HttpResponse
from .views import stations_geojson, NearbyStations, map_page

def health(request):
    return HttpResponse("ok")

urlpatterns = [
    path("stations/", stations_geojson, name="stations_geojson"),
    path("stations/nearby/", NearbyStations.as_view(), name="nearby_stations"),
    path("health/", health, name="health"),
    path("map/", map_page, name="map_page"),
]
