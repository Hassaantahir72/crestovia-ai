export default function AssistantAvatar({ size = 72 }: { size?: number }) {
  return (
    <span className="assistant-avatar-frame" style={{ width: size, height: size }} role="img" aria-label="Crestovai AI female virtual assistant avatar">
      <img src="/crestovai-female-avatar.svg" width={size} height={size} alt="" />
    </span>
  );
}
