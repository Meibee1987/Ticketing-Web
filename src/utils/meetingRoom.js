const NON_ROOM_MEETING_TYPES = new Set(['daring', 'online']);

export const usesPhysicalRoom = (meetingType) =>
  !NON_ROOM_MEETING_TYPES.has(
    String(meetingType || 'luring')
      .trim()
      .toLowerCase()
  );
