type Props = {
  title: string;
  message?: string;
};

export function EmptyState({ title, message }: Props) {
  return (
    <div class="empty-state">
      <p class="empty-state__title">{title}</p>
      {message && <p class="empty-state__message">{message}</p>}
    </div>
  );
}
