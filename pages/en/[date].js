export { default } from '../[date]';
export { getDatePageProps } from '../[date]';

export async function getServerSideProps(context) {
  const { getDatePageProps: loadDatePageProps } = await import('../[date]');
  return loadDatePageProps(context, 'en-US');
}
