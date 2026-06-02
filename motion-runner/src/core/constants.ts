// ---- 游戏参数 ----
export const GAME_CONFIG = {
  INITIAL_SPEED: 10,
  MAX_SPEED: 30,
  ACCELERATION: 0.5,
  TRACK_WIDTH: 6,
  SEGMENT_LENGTH: 30,
  VISIBLE_SEGMENTS: 5,
  PLAYER_Z: 0,
  JUMP_FORCE: 8,
  GRAVITY: -25,
  OBSTACLE_GAP_MIN: 8,
  OBSTACLE_GAP_MAX: 15,
  /** 最大逻辑帧步长 (s)，防止大 delta 跳帧 */
  MAX_DELTA: 0.05,
  /** 默认帧间隔 (s)，首帧无 lastTime 时使用 */
  FALLBACK_DELTA: 0.016,
  /** 换道平滑系数 */
  LANE_SMOOTH: 10,
  /** 里程碑距离间隔 (m) */
  MILESTONE_INTERVAL: 50,
};

// ---- 渲染 ----
export const RENDER_CONFIG = {
  BG_COLOR: 0x87CEEB,
  FOG_NEAR: 20,
  FOG_FAR: 50,
  PLAYER_COLOR: 0x00FF88,
  OBSTACLE_COLOR: 0xFF4444,
  /** 摄像机 FOV */
  CAMERA_FOV: 70,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 100,
  CAMERA_Y: 5,
  CAMERA_Z: 10,
  /** 阴影贴图分辨率 */
  SHADOW_MAP_SIZE: 2048,
  /** 阴影视锥体大小 */
  SHADOW_FRUSTUM: 15,
  /** 环境光 */
  AMBIENT_INTENSITY: 0.5,
  /** 主方向光 */
  DIR_LIGHT_INTENSITY: 1.5,
  /** 补光 */
  FILL_LIGHT_INTENSITY: 0.3,
};

// ---- 道路纹理 ----
export const TRACK_TEX = {
  /** 纹理精度 (像素/世界单位) */
  SCALE: 32,
  /** 路面底色 */
  FILL_COLOR: '#3a3a3a',
  /** 沥青噪点强度 */
  NOISE_STRENGTH: 20,
  /** 纹理滚动速率 */
  SCROLL_RATE: 0.05,
  /** 车道分隔线颜色/透明度 */
  DASH_COLOR: 'rgba(255,255,255,0.35)',
  /** 边线颜色/透明度 */
  EDGE_COLOR: 'rgba(255,255,255,0.6)',
};

// ---- 碰撞体 ----
export const COLLISION = {
  /** 玩家碰撞半宽 (x) */
  PLAYER_HALF_W: 0.8,
  /** 玩家碰撞半深 (z) */
  PLAYER_HALF_D: 0.6,
  /** 站立高度 */
  STAND_HEIGHT: 1.8,
  /** 滑铲高度 */
  SLIDE_HEIGHT: 0.6,
  /** 障碍物半宽/半深 */
  OBS_HALF: 0.9,
};

// ---- 障碍物 ----
export const OBSTACLE = {
  /** Box 高度 / 中心 Y */
  BOX_H: 1.2, BOX_Y: 0.6,
  /** Low 高度 / 中心 Y */
  LOW_H: 0.5, LOW_Y: 0.25,
  /** High 高度 / 中心 Y */
  HIGH_H: 1.8, HIGH_Y: 0.9,
  /** 消失距离 (超过此 z 值回收) */
  CULL_Z: 20,
  /** 初始最远 Z (无障碍时) */
  INIT_FARTHEST_Z: -50,
  /** 生成触发距离 */
  SPAWN_TRIGGER_Z: -40,
  /** 初始障碍数 */
  INITIAL_COUNT: 5,
};

// ---- 景物 ----
export const SCENERY = {
  /** 树木数量 */
  TREE_COUNT: 160,
  /** 分布范围 (z 方向) */
  SPREAD_Z: 130,
  /** 回收位置 */
  RESET_Z: -130,
  /** 消失位置 */
  CULL_Z: 30,
  /** 树干颜色 */
  TRUNK_COLOR: 0x6B4226,
  /** 树冠颜色 */
  CANOPY_COLOR: 0x2D7D2D,
  /** 距跑道边的最小距离 */
  MIN_DIST: 2,
  /** 距跑道边的最大距离 */
  MAX_DIST: 12,
};

// ---- 区域检测 ----
export const ZONE = {
  /** 消抖帧数 */
  DEBOUNCE: 3,
  /** EMA 平滑系数 (中性位置) */
  EMA_ALPHA: 0.02,
  /** 2 车道信号放大倍数 */
  SENSITIVITY_2: 3.5,
  /** 3 车道信号放大倍数 */
  SENSITIVITY_3: 2.0,
  /** 边界滞回触发比例 */
  HYSTERESIS_ENTER: 0.85,
  HYSTERESIS_EXIT: 1.15,
};

// ---- 时序平滑 ----
export const SMOOTHING = {
  /** 关键点 EMA 平滑系数 (0-1, 越大响应越快) */
  LANDMARK_ALPHA: 0.4,
  /** 骨骼长度变化容忍比例 (超过此比例视为异常帧) */
  BONE_LENGTH_TOLERANCE: 0.25,
};

// ---- 难度预设 ----
export const DIFFICULTY = {
  easy:   { lanes: 2, density: 2.5 },
  medium: { lanes: 3, density: 1.0 },
  hard:   { lanes: 3, density: 0.6 },
};

// ---- 帧处理 ----
export const FRAME = {
  /** createImageBitmap 目标宽 */
  RESIZE_W: 256,
  /** createImageBitmap 目标高 */
  RESIZE_H: 256,
  /** 摄像头采集分辨率 (ideal) */
  CAMERA_W: 1280,
  CAMERA_H: 720,
};
