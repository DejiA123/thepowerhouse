import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasFeature, type FeatureId } from '@/config/church';

/** Pages that belong to a part of the app a church can switch off (most specific first) */
const FEATURE_PAGES: [RegExp, FeatureId][] = [
  [/^\/groups\/choir\/contributions/, 'choirContributions'],
  [/^\/groups\/choir\/national/, 'choirNational'],
  [/^\/groups\/choir/, 'choir'],
  [/^\/groups\/management/, 'management'],
  [/^\/groups\/ushering/, 'ushering'],
  [/^\/groups\/evangelism/, 'evangelism'],
  [/^\/groups\/pastoral/, 'pastoral'],
  [/^\/(follow-up-team|team-follow-up)/, 'teamFollowUp'],
  [/^\/(groups|serve|fellowship-group)/, 'teams'],
  [/^\/campus-fellowship/, 'campusFellowships'],
  [/^\/building-campaign/, 'buildingCampaign'],
  [/^\/follow-up$/, 'serviceFeedback'],
  [/^\/social-media/, 'socialMedia'],
  [/^\/new-here/, 'newHere'],
  [/^\/give/, 'giving'],
  [/^\/prayer/, 'prayerWall'],
  [/^\/news/, 'events'],
];

/** A page of a part this church doesn't use opens Home instead (old links, bookmarks). */
const FeatureGate = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const feature = FEATURE_PAGES.find(([pattern]) => pattern.test(pathname))?.[1];
  if (feature && !hasFeature(feature)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default FeatureGate;
