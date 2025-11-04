from rest_framework.routers import DefaultRouter
from .views import StationViewSet
from django.urls import path
from django.http import HttpResponse
from .views import StationViewSet, map_page  

# Router for StationViewSet
router = DefaultRouter()
router.register(r"stations", StationViewSet, basename="stations")


def health(request):
	return HttpResponse("ok")

# URL patterns (explicit list)
urlpatterns = [
	*router.urls,
	path("health/", health),
	path("map/", map_page, name="map_page")
]