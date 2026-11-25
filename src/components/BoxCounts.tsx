/** Box counts for packing, one size per line: "מארזי 6: 12" / "מארזי 4: 5". */
export function BoxCounts({ counts }: { counts: { size: number; count: number }[] }) {
  if (counts.length === 0) return <p>עוד אין מארזים</p>;
  return (
    <ul>
      {counts.map(({ size, count }) => (
        <li key={size}>
          מארזי {size}: {count}
        </li>
      ))}
    </ul>
  );
}
