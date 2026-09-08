const getMergeKey = (schedule) =>
  JSON.stringify([
    schedule.type,
    schedule.kegiatan,
    schedule.kode,
    schedule.tempat,
    schedule.dosen,
    schedule.jenis_pertemuan,
  ]);

const toTimestamp = (value) => {
  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export function mergeConsecutiveSchedules(schedules) {
  const mergedSchedules = [];
  const latestScheduleByKey = new Map();

  schedules.forEach((schedule) => {
    const key = getMergeKey(schedule);
    const previousSchedule = latestScheduleByKey.get(key);
    const previousEnd = previousSchedule
      ? toTimestamp(previousSchedule.akhir)
      : null;
    const currentStart = toTimestamp(schedule.mulai);

    if (
      previousSchedule &&
      previousEnd !== null &&
      currentStart !== null &&
      previousEnd === currentStart
    ) {
      previousSchedule.akhir = schedule.akhir;
      previousSchedule.mergedScheduleIds.push(schedule.id);
      return;
    }

    const nextSchedule = {
      ...schedule,
      mergedScheduleIds: [schedule.id],
    };
    mergedSchedules.push(nextSchedule);
    latestScheduleByKey.set(key, nextSchedule);
  });

  return mergedSchedules;
}
