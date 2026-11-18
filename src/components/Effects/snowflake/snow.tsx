import "./snowflake.scss";

export default function Snow({ count = 80 }) {
  return (
    <div className="snow" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span className="snowflake" key={i} />
      ))}
    </div>
  );
}
