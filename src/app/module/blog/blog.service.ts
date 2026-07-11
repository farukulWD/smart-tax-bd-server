import httpStatus from 'http-status';
import sanitizeHtml from 'sanitize-html';
import AppError from '../../errors/AppError';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import { IBlog } from './blog.interface';
import { Blog } from './blog.model';

const sanitizeContent = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
  });

// Unicode-safe slug — \p{M} keeps combining marks (Bengali vowel signs) intact
const toSlug = (title: string) => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `post-${Date.now()}`;
};

const generateUniqueSlug = async (title: string) => {
  const base = toSlug(title);
  let slug = base;
  let counter = 2;
  while (await Blog.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

const deriveExcerpt = (html: string) => {
  // Space before each tag so stripped block elements don't merge words
  const text = sanitizeHtml(html.replace(/</g, ' <'), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const createBlogToDB = async (
  payload: Partial<IBlog>,
  file?: Express.Multer.File,
) => {
  if (file) {
    const uploadResult = await sendImageToCloudinary(
      `blog-${Date.now()}`,
      file.path,
      file.mimetype,
    );
    payload.coverImage = uploadResult.secure_url as string;
  }

  payload.content = sanitizeContent(payload.content as string);
  payload.slug = await generateUniqueSlug(payload.title as string);

  if (!payload.excerpt) {
    payload.excerpt = deriveExcerpt(payload.content);
  }

  if (payload.status === 'published') {
    payload.publishedAt = new Date();
  }

  const result = await Blog.create(payload);
  return result;
};

const getAllBlogsFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 9;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { status: 'published' };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.search) {
    const search = new RegExp(String(query.search), 'i');
    filter.$or = [{ title: search }, { tags: search }];
  }

  const [data, total] = await Promise.all([
    Blog.find(filter)
      .select('-content')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit),
    Blog.countDocuments(filter),
  ]);

  return {
    data,
    meta: { limit, page, total, totalPage: Math.ceil(total / limit) },
  };
};

const getCategoriesFromDB = async () => {
  const result = await Blog.distinct('category', { status: 'published' });
  return result;
};

const getSingleBlogFromDB = async (slug: string) => {
  const blog = await Blog.findOneAndUpdate(
    { slug, status: 'published' },
    { $inc: { views: 1 } },
    { new: true },
  );

  if (!blog) {
    throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  }

  const related = await Blog.find({
    status: 'published',
    category: blog.category,
    _id: { $ne: blog._id },
  })
    .select('-content')
    .sort({ publishedAt: -1 })
    .limit(3);

  return { blog, related };
};

const getAllBlogsAdminFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.search) {
    const search = new RegExp(String(query.search), 'i');
    filter.$or = [{ title: search }, { tags: search }];
  }

  const [data, total] = await Promise.all([
    Blog.find(filter)
      .select('-content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Blog.countDocuments(filter),
  ]);

  return {
    data,
    meta: { limit, page, total, totalPage: Math.ceil(total / limit) },
  };
};

const getSingleBlogAdminFromDB = async (id: string) => {
  const result = await Blog.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  }
  return result;
};

const updateBlogInDB = async (
  id: string,
  payload: Partial<IBlog>,
  file?: Express.Multer.File,
) => {
  const isExist = await Blog.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  }

  if (file) {
    const uploadResult = await sendImageToCloudinary(
      `blog-${Date.now()}`,
      file.path,
      file.mimetype,
    );
    payload.coverImage = uploadResult.secure_url as string;
  }

  if (payload.content) {
    payload.content = sanitizeContent(payload.content);
  }

  if (
    payload.status === 'published' &&
    isExist.status !== 'published' &&
    !isExist.publishedAt
  ) {
    payload.publishedAt = new Date();
  }

  const result = await Blog.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteBlogFromDB = async (id: string) => {
  const isExist = await Blog.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  }
  const result = await Blog.findByIdAndDelete(id);
  return result;
};

export const BlogService = {
  createBlogToDB,
  getAllBlogsFromDB,
  getCategoriesFromDB,
  getSingleBlogFromDB,
  getAllBlogsAdminFromDB,
  getSingleBlogAdminFromDB,
  updateBlogInDB,
  deleteBlogFromDB,
};
