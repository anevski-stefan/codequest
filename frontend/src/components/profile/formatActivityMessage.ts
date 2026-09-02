export interface ActivityLike {
  type: string;
  payload: { ref_type?: string; action?: string };
}

export const formatActivityMessage = (event: ActivityLike): string => {
  switch (event.type) {
    case 'PushEvent':
      return 'pushed to';
    case 'CreateEvent':
      return `created ${event.payload.ref_type}`;
    case 'IssuesEvent':
      return `${event.payload.action} issue in`;
    case 'PullRequestEvent':
      return `${event.payload.action} pull request in`;
    case 'ForkEvent':
      return 'forked';
    case 'WatchEvent':
      return 'starred';
    default:
      return 'interacted with';
  }
};
