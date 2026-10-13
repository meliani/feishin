// Types mirror the hub REST contract (docs/CONTRACT.md section 4 in the cercle repo).

export type CercleCircle = {
    created_at: string;
    description: string;
    id: string;
    kind: 'custom' | 'everyone';
    member_count: number;
    my_role: CercleRole | null;
    name: string;
};

export type CercleCircleDetail = CercleCircle & { members: CercleMember[] };

export type CercleCircleStats = CercleStats & {
    members: { ms: number; plays: number; user: CercleUser }[];
};

export type CercleComment = {
    body: string;
    created_at: string;
    edited_at: null | string;
    id: string;
    user: CercleUser;
};

export type CercleCompare = {
    common_albums: CercleStatEntry[];
    common_artists: CercleStatEntry[];
    score: number;
};

export type CercleError = {
    error: { code: string; message: string };
};

export type CercleFeedItem = {
    album?: { artist: string; id: string; name: string };
    artist?: { id: string; name: string };
    comment_count: number;
    ended_at: string;
    id: string;
    kind: 'discovery_album' | 'discovery_artist' | 'listened';
    play_count: number;
    reactions: CercleReaction[];
    started_at: string;
    track?: CercleTrack;
    user: CercleUser;
};

export type CercleHidden = {
    id: string;
    kind: CercleHiddenKind;
    label: string;
};

export type CercleHiddenKind = 'album' | 'artist' | 'track';

export type CercleInvite = {
    circle_id: string;
    code: string;
    created_by: string;
    expires_at: null | string;
    max_uses: number;
    url_path: string;
    uses: number;
};

export type CercleInvitePreview = {
    circle: { id: string; member_count: number; name: string };
    created_by: CercleUser;
    valid: boolean;
};

export type CercleList<T> = { items: T[] };

export type CercleLive = {
    player_name: string;
    position_ms: number;
    started_at: string;
    state: 'paused' | 'playing';
    track: CercleTrack;
    updated_at: string;
    user: CercleUser;
};

export type CercleMe = CercleUser & { settings: CercleSettings };

export type CercleMember = {
    joined_at: string;
    role: CercleRole;
    sharing?: CercleSharing;
    user: CercleUser;
};

export type CerclePage<T> = { items: T[]; next: null | string };

export type CerclePlay = {
    id: string;
    played_at: string;
    player_name: string;
    track: CercleTrack;
};

export type CercleRange = '7d' | '30d' | 'all' | 'year' | string;

export type CercleReaction = { count: number; emoji: string; mine: boolean };

export type CercleRole = 'admin' | 'member' | 'owner';

export type CercleRoom = {
    circle_id: string;
    created_at: string;
    host: CercleUser;
    id: string;
    listeners: CercleUser[];
    name: string;
    state: CercleRoomState;
};

export type CercleRoomDetail = CercleRoom & { requests: CercleRoomRequest[] };

export type CercleRoomRequest = {
    created_at: string;
    id: string;
    track: CercleTrack;
    user: CercleUser;
};

export type CercleRoomState = {
    playing: boolean;
    position_ms: number;
    queue: string[];
    seq: number;
    track_id: null | string;
    updated_at: string;
};

export type CercleRoomStateInput = Omit<CercleRoomState, 'seq' | 'updated_at'>;

export type CercleSession = { token: string; user: CercleUser };

export type CercleSettings = {
    hidden: CercleHidden[];
    history_delay_minutes: number;
    paused_until: null | string;
};

export type CercleSharing = {
    share_discoveries: boolean;
    share_history: boolean;
    share_live: boolean;
    share_stats: boolean;
};

export type CercleStatEntry = {
    album_id?: string;
    artist?: string;
    id: string;
    ms: number;
    name: string;
    plays: number;
};

export type CercleStats = {
    by_day: { date: string; plays: number }[];
    by_hour: number[];
    by_weekday: number[];
    range: string;
    top_albums: CercleStatEntry[];
    top_artists: CercleStatEntry[];
    top_tracks: CercleStatEntry[];
    totals: {
        active_days: number;
        distinct_albums: number;
        distinct_artists: number;
        ms: number;
        plays: number;
    };
};

export type CercleTrack = {
    album: string;
    album_id: string;
    artist: string;
    artist_id: string;
    duration_ms: number;
    id: string;
    title: string;
};

export type CercleUser = {
    created_at: string;
    display_name: string;
    is_admin: boolean;
    last_seen_at: null | string;
    username: string;
};

export type CercleUserDetail = CercleUser & { common_circles: CercleCircle[] };

export type CercleWrapped = CercleStats & {
    // The contract leaves this untyped; the hub sends {track, played_at}.
    first_play: null | string | { played_at: string; track: CercleTrack };
    longest_day: null | { date: string; ms: number };
    new_artists: number;
    top_month: null | string;
};

export type CercleWsMessage =
    | { data: CercleFeedItem; type: 'feed_item' }
    | { data: CercleLive; type: 'live' }
    | { data: CercleRoom; type: 'room_update' }
    | { data: Record<string, never>; type: 'pong' }
    | { data: { comment: CercleComment; item_id: string }; type: 'comment' }
    | { data: { comment_id: string; item_id: string }; type: 'comment_deleted' }
    | { data: { item_id: string; reactions: CercleReaction[] }; type: 'reaction' }
    | { data: { request: CercleRoomRequest; room_id: string }; type: 'room_request' }
    | { data: { room_id: string; state: CercleRoomState }; type: 'room_state' }
    | { data: { room_id: string }; type: 'room_closed' }
    | { data: { user: CercleMe }; type: 'hello' }
    | { data: { username: string }; type: 'live_end' };
