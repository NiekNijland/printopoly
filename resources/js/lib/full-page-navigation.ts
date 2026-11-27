// The one door out of the Inertia app, for an address Inertia cannot visit; a visit inside the app is router.visit.
export const loadFullPage = (url: string): void => {
    window.location.assign(url);
};
