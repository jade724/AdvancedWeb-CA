from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from .models import Station

class StationGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Station
        geo_field = "geom"
        fields = ("id", "name", "station_type", "fuel_price", "updated_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        geom = instance.geom
        if geom and isinstance(geom, Point):
            data["geometry"] = {
                "type": "Point",
                "coordinates": [geom.x, geom.y]
            }
        return data
