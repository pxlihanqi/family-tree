import { getAliveMembersForHolidayPublisher, getHolidayMediaByMomentIds, getHolidayMoments } from "./actions";
import { HolidayMoments } from "./holiday-moments";

export async function HolidayMomentsLoader() {
  const [moments, members] = await Promise.all([
    getHolidayMoments(),
    getAliveMembersForHolidayPublisher(),
  ]);

  const momentIds = moments.map((moment) => moment.id);
  const media = await getHolidayMediaByMomentIds(momentIds);

  const mediaByMoment = new Map<number, typeof media>();
  for (const item of media) {
    const list = mediaByMoment.get(item.moment_id) ?? [];
    list.push(item);
    mediaByMoment.set(item.moment_id, list);
  }

  const momentsWithMedia = moments.map((moment) => ({
    ...moment,
    media: mediaByMoment.get(moment.id) ?? [],
  }));

  return <HolidayMoments moments={momentsWithMedia} members={members} />;
}
