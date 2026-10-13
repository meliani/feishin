import { Route, Routes } from 'react-router';

import '/@/renderer/features/cercle/i18n/cercle-i18n';
import CircleDetailRoute from '/@/renderer/features/cercle/routes/circle-detail-route';
import CirclesRoute from '/@/renderer/features/cercle/routes/circles-route';
import CompareRoute from '/@/renderer/features/cercle/routes/compare-route';
import FeedRoute from '/@/renderer/features/cercle/routes/feed-route';
import JoinRoute from '/@/renderer/features/cercle/routes/join-route';
import LiveRoute from '/@/renderer/features/cercle/routes/live-route';
import PrivacyRoute from '/@/renderer/features/cercle/routes/privacy-route';
import RoomRoute from '/@/renderer/features/cercle/routes/room-route';
import RoomsRoute from '/@/renderer/features/cercle/routes/rooms-route';
import StatsRoute from '/@/renderer/features/cercle/routes/stats-route';
import WrappedRoute from '/@/renderer/features/cercle/routes/wrapped-route';

// Mounted by the app router at /cercle/*; everything below is relative to it.
const CercleRoutes = () => (
    <Routes>
        <Route element={<FeedRoute />} index />
        <Route element={<LiveRoute />} path="live" />
        <Route element={<StatsRoute />} path="stats" />
        <Route element={<StatsRoute />} path="stats/user/:username" />
        <Route element={<StatsRoute />} path="stats/circle/:circleId" />
        <Route element={<CompareRoute />} path="compare" />
        <Route element={<CompareRoute />} path="compare/:username" />
        <Route element={<WrappedRoute />} path="wrapped" />
        <Route element={<WrappedRoute />} path="wrapped/:year" />
        <Route element={<CirclesRoute />} path="circles" />
        <Route element={<CircleDetailRoute />} path="circles/:circleId" />
        <Route element={<JoinRoute />} path="join/:code" />
        <Route element={<RoomsRoute />} path="rooms" />
        <Route element={<RoomRoute />} path="rooms/:roomId" />
        <Route element={<PrivacyRoute />} path="privacy" />
        <Route element={<FeedRoute />} path="*" />
    </Routes>
);

export default CercleRoutes;
