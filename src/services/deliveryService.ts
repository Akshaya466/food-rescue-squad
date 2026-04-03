import { Delivery } from "@/types";

const mockDeliveries: Delivery[] = [
  {
    id: "d1", listingId: "fl4", volunteerId: "v1", donorId: "u3",
    status: "assigned", pickupAddress: "Mount Road, Chennai",
    dropAddress: "Hope Foundation, Adyar, Chennai",
    estimatedTime: "25 min", distanceKm: 4.2,
    foodDetails: "Paneer Butter Masala — 8 kg (cooked)",
    createdAt: new Date().toISOString(),
  },
  {
    id: "d2", listingId: "fl5", volunteerId: "v1", donorId: "u1",
    status: "delivered", pickupAddress: "Guindy, Chennai",
    dropAddress: "Helping Hands NGO, Velachery",
    estimatedTime: "—", distanceKm: 6.1,
    foodDetails: "Dal Tadka & Rice — 30 portions",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function getActiveDeliveries(volunteerId: string): Promise<Delivery[]> {
  return mockDeliveries.filter((d) => d.volunteerId === volunteerId && d.status !== "delivered");
}

export async function updateDeliveryStatus(deliveryId: string, status: Delivery["status"]): Promise<Delivery> {
  const d = mockDeliveries.find((x) => x.id === deliveryId);
  if (!d) throw new Error("Delivery not found");
  d.status = status;
  return d;
}

export async function getDeliveryHistory(volunteerId: string): Promise<Delivery[]> {
  return mockDeliveries.filter((d) => d.volunteerId === volunteerId && d.status === "delivered");
}

export async function getAllDeliveries(): Promise<Delivery[]> {
  return [...mockDeliveries];
}
