function hasNextLink(linkHeader) {
  if (!linkHeader) return false;
  return /rel="?next"?/.test(linkHeader);
}

function clampPage(rawPage, maxPage = 10000) {
  const page = parseInt(rawPage, 10);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, maxPage);
}

function buildPagination({ page, perPage, totalCount, linkHeader }) {
  const hasMore = linkHeader
    ? hasNextLink(linkHeader)
    : typeof totalCount === 'number' && page * perPage < totalCount;
  return {
    hasMore,
    nextPage: hasMore ? page + 1 : null
  };
}

module.exports = {
  hasNextLink,
  clampPage,
  buildPagination
};