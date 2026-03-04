import { getAnnouncements } from "./actions";
import { Announcements } from "./announcements";

export async function AnnouncementsLoader() {
  const announcements = await getAnnouncements();
  return <Announcements announcements={announcements} />;
}
