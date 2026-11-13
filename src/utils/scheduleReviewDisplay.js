export function reviewFields(row) {
  const issues = (row?.issues || []).join(' ').toLowerCase();
  const conflict = /konflik|bentur|duplik/.test(issues);
  return {
    time: conflict || /waktu|jam|tanggal/.test(issues) || !issues,
    room: /ruang|lokasi/.test(issues),
    lecturers: /dosen|pembimbing|penguji/.test(issues),
    activity: /agenda|mata kuliah/.test(issues),
    cohorts: /angkatan/.test(issues),
    student: /mahasiswa/.test(issues),
  };
}

export function reviewDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Tanggal belum valid';
}

export function conflictingLecturerIds(issues = []) {
  return [
    ...new Set(
      issues.flatMap((issue) =>
        [
          ...String(issue).matchAll(/Konflik dosen ID (\d+(?:,\s*\d+)*)/gi),
        ].flatMap((match) => match[1].split(/,\s*/))
      )
    ),
  ];
}

export function reviewIssue(issue, dosen = []) {
  return String(issue)
    .replace(
      /dosen ID (\d+(?:,\s*\d+)*)/gi,
      (_, ids) =>
        `dosen ${ids
          .trim()
          .split(/,\s*/)
          .map(
            (id) =>
              dosen.find((item) => String(item.id) === id)?.nama_dosen ||
              `ID ${id}`
          )
          .join(', ')}`
    )
    .replace(
      / dengan (Perkuliahan|Karya Akhir|Lain-lain) ID \d+/g,
      ' dengan $1'
    )
    .replace(
      /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})(?::\d{2})?/g,
      '$3/$2/$1 $4'
    );
}

export function reviewIssueDetails(issues = [], dosen = []) {
  return issues
    .flatMap((issue) => String(issue).split(/;\s*/))
    .filter(Boolean)
    .map((issue) => {
      const match = issue.match(
        /^(Konflik dosen ID ([\d, ]+)|Konflik ruangan|Duplikat jadwal) dengan (Perkuliahan|Karya Akhir|Lain-lain) (?:ID|baris sumber) \d+ \((.+) - (.+)\)$/
      );
      if (!match) return { title: reviewIssue(issue, dosen), lecturers: [] };
      return {
        title: match[2] ? 'Konflik dosen' : match[1],
        lecturers: match[2]
          ? match[2]
              .trim()
              .split(/,\s*/)
              .map(
                (id) =>
                  dosen.find((item) => String(item.id) === id)?.nama_dosen ||
                  `ID ${id}`
              )
          : [],
        activity: match[3],
        start: reviewIssue(match[4]),
        end: reviewIssue(match[5]),
      };
    });
}
