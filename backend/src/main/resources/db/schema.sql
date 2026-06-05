CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    role_title VARCHAR(120) NOT NULL,
    auth_provider VARCHAR(30) NOT NULL,
    external_auth_id VARCHAR(190),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE birth_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    gender VARCHAR(16) NOT NULL,
    birth_date DATE NOT NULL,
    birth_time TIME NOT NULL,
    birth_place_name VARCHAR(120) NOT NULL DEFAULT '서울',
    birth_place_latitude DECIMAL(10, 7),
    birth_place_longitude DECIMAL(10, 7),
    birth_place_utc_offset INT NOT NULL DEFAULT 9,
    calendar_type VARCHAR(16) NOT NULL,
    timezone_name VARCHAR(60) NOT NULL DEFAULT 'Asia/Seoul',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_birth_profile_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE mansae_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    source_provider VARCHAR(80) NOT NULL,
    source_status VARCHAR(40) NOT NULL,
    year_pillar VARCHAR(40),
    month_pillar VARCHAR(40),
    day_pillar VARCHAR(40),
    hour_pillar VARCHAR(40),
    raw_payload_json JSON,
    calculated_at DATETIME,
    CONSTRAINT fk_mansae_profile_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE communication_analyses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subject_user_id BIGINT NOT NULL,
    viewer_user_id BIGINT,
    archetype VARCHAR(80) NOT NULL,
    personality_summary TEXT NOT NULL,
    work_style_summary TEXT NOT NULL,
    message_guide TEXT NOT NULL,
    recommendation_json JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analysis_subject FOREIGN KEY (subject_user_id) REFERENCES users(id),
    CONSTRAINT fk_analysis_viewer FOREIGN KEY (viewer_user_id) REFERENCES users(id),
    CONSTRAINT uq_analysis_subject_viewer UNIQUE (subject_user_id, viewer_user_id)
);

CREATE TABLE workspaces (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    owner_user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE workspace_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    member_role VARCHAR(30) NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_member_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    CONSTRAINT fk_workspace_member_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE TABLE teammate_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    teammate_user_id BIGINT NOT NULL,
    relation_label VARCHAR(80),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_teammate_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
    CONSTRAINT fk_teammate_target FOREIGN KEY (teammate_user_id) REFERENCES users(id),
    CONSTRAINT uq_teammate_link UNIQUE (owner_user_id, teammate_user_id)
);

CREATE TABLE calendar_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_calendar_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    CONSTRAINT fk_calendar_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE calendar_event_attendees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    response_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    CONSTRAINT fk_event_attendee_event FOREIGN KEY (event_id) REFERENCES calendar_events(id),
    CONSTRAINT fk_event_attendee_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_event_attendee UNIQUE (event_id, user_id)
);

CREATE TABLE chat_channels (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    channel_name VARCHAR(120) NOT NULL,
    channel_type VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_channel_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    sender_user_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_message_channel FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_user_id) REFERENCES users(id)
);
