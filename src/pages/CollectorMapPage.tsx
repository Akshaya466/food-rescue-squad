import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function CollectorMapPage() {
  return (
    <DashboardLayout role="collector">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Live Map</h1>
        <Card>
          <CardContent className="p-0">
            <div className="h-[calc(100vh-12rem)] bg-muted flex items-center justify-center text-muted-foreground rounded-lg">
              <div className="text-center space-y-2">
                <MapPin className="h-16 w-16 mx-auto text-primary/30" />
                <p className="font-medium">Map View</p>
                <p className="text-sm">Leaflet / Google Maps will render here</p>
                <p className="text-xs">🟢 Fresh  🟠 Expiring soon  🔴 Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
