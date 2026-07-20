import Card from './Card.jsx';
import Loader from './Loader.jsx';
import EmptyState from './EmptyState.jsx';

const Shell = ({
  loading,
  error,
  isEmpty,
  loadingLabel = 'Loading…',
  emptyIcon,
  emptyTitle = 'Nothing here yet.',
  emptyDescription,
  children,
}) => {
  if (loading) return <Loader label={loadingLabel} />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <Card className="p-0">
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </Card>
    );
  }

  return children;
};

export default Shell;