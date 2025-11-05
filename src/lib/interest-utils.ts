export const INTEREST_TO_CATEGORIES: Record<string, string[]> = {
  coffee: ["café", "french café", "dessert"],
  tea: ["café", "french café"],
  yoga: ["park", "nature park"],
  fitness: ["park", "nature park"],
  art: ["museum", "gallery", "historic site"],
  music: ["music venue"],
  beer: ["brewery"],
  wine: ["brewery"],
  food: ["market", "mixed-use / hangout"],
  sports: ["park"],
  reading: ["bookstore", "café"],
  books: ["bookstore", "café"],
  gaming: ["games & comics", "arcade"],
  shopping: ["thrift", "shopping", "market"],
  nature: ["park", "nature park"],
  history: ["historic site", "museum"],
};

export const INTEREST_TAGS: Record<string, string[]> = {
  coffee: ["☕ Coffee", "💻 Work-friendly", "🔇 Quiet"],
  tea: ["🍵 Tea", "🔇 Quiet", "📚 Reading-friendly"],
  yoga: ["🧘 Wellness", "🌳 Peaceful", "🌞 Outdoor"],
  fitness: ["💪 Active", "🌳 Outdoor", "🏃 Exercise"],
  art: ["🎨 Creative", "🖼️ Visual", "📸 Photo-worthy"],
  music: ["🎵 Live music", "🎤 Performance", "🎸 Entertainment"],
  beer: ["🍺 Craft beer", "🍻 Social", "🎯 Hangout"],
  wine: ["🍷 Wine", "🍻 Social", "🎯 Hangout"],
  food: ["🍽️ Dining", "👨‍🍳 Local", "🌮 Tasty"],
  sports: ["⚽ Sports", "🌳 Outdoor", "💪 Active"],
  reading: ["📚 Books", "🔇 Quiet", "☕ Cozy"],
  books: ["📚 Books", "🔇 Quiet", "☕ Cozy"],
  gaming: ["🎮 Games", "👾 Arcade", "🎯 Fun"],
  shopping: ["🛍️ Shopping", "👗 Unique finds", "💎 Local"],
  nature: ["🌳 Nature", "🌞 Outdoor", "🦋 Scenic"],
  history: ["🏛️ Historic", "📜 Educational", "🎓 Cultural"],
};

export function getCommonInterests(interests1: string[], interests2: string[]): string[] {
  return interests1.filter(interest => interests2.includes(interest));
}

export function getCategoriesForInterests(interests: string[]): string[] {
  const categories = new Set<string>();
  interests.forEach(interest => {
    const interestCategories = INTEREST_TO_CATEGORIES[interest.toLowerCase()];
    if (interestCategories) {
      interestCategories.forEach(cat => categories.add(cat));
    }
  });
  return Array.from(categories);
}

export function getTagsForInterests(interests: string[]): string[] {
  const tags = new Set<string>();
  interests.forEach(interest => {
    const interestTags = INTEREST_TAGS[interest.toLowerCase()];
    if (interestTags) {
      interestTags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags);
}
