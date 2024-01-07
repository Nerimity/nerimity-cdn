export const Errors = {
  INVALID_PATH: () => ({type: "INVALID_PATH"}),
  INTERNAL_ERROR: () => ({type: "INTERNAL_ERROR"}),
  FILE_NOT_FOUND: () => ({type: "FILE_NOT_FOUND"}),
  INVALID_IMAGE: () => ({type: "INVALID_IMAGE"}),
  INVALID_POINTS: () => ({type: "INVALID_POINTS"}),
  INVALID_SECRET: () => ({type: "INVALID_SECRET"}),
  COMPRESS_ERROR: () => ({type: "COMPRESS_ERROR"}),
  INVALID_IMAGE: () => ({type: "INVALID_IMAGE", supported: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']}),

  MAX_SIZE_LIMIT: (limit) => ({ type: "MAX_SIZE_LIMIT", limit }),
  MAX_FILES_LIMIT: () => ({ type: "MAX_FILES_LIMIT" }),
  MAX_FIELD_LIMIT: () => ({ type: "MAX_FIELD_LIMIT" }),
  MAX_PARTS_LIMIT: () => ({ type: "MAX_PARTS_LIMIT" }),
}