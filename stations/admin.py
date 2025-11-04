from django.contrib import admin
from .models import Station
# Register your models here.

@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("name", "station_type", "fuel_price", "updated_at")
    list_filter = ("station_type",)
    search_fields = ("name", )