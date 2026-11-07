/**
 * High-quality food and beverage fallback images for menu items
 * Used when a menu item has no custom photo uploaded.
 */
export function getFoodFallbackImage(name: string, categoryName: string = ""): string {
  const text = `${name} ${categoryName}`.toLowerCase();

  // Coffee & Espresso
  if (text.includes("espresso") || text.includes("americano") || text.includes("black coffee")) {
    return "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600";
  }
  if (text.includes("cappuccino") || text.includes("latte") || text.includes("flat white") || text.includes("macchiato")) {
    return "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=600";
  }
  if (text.includes("cold coffee") || text.includes("frappe") || text.includes("iced") || text.includes("cold brew")) {
    return "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600";
  }
  if (text.includes("coffee") || text.includes("mocha") || text.includes("brew")) {
    return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600";
  }

  // Tea, Boba & Beverages
  if (text.includes("tea") || text.includes("chai") || text.includes("matcha")) {
    return "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600";
  }
  if (text.includes("smoothie") || text.includes("shake") || text.includes("beverage") || text.includes("cooler") || text.includes("mojito")) {
    return "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=600";
  }

  // Bakery, Croissant & Pastry
  if (text.includes("croissant") || text.includes("bagel") || text.includes("muffin") || text.includes("bakery")) {
    return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600";
  }
  if (text.includes("cake") || text.includes("pastry") || text.includes("brownie") || text.includes("cheesecake") || text.includes("dessert")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600";
  }

  // Pizza & Pasta
  if (text.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600";
  }
  if (text.includes("pasta") || text.includes("spaghetti") || text.includes("lasagna") || text.includes("penne")) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&q=80&w=600";
  }

  // Burger & Sandwich
  if (text.includes("burger") || text.includes("slider")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600";
  }
  if (text.includes("sandwich") || text.includes("toast") || text.includes("panini") || text.includes("avocado")) {
    return "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=600";
  }

  // Fries, Snacks & Starters
  if (text.includes("fry") || text.includes("fries") || text.includes("nachos") || text.includes("nugget") || text.includes("snack")) {
    return "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&q=80&w=600";
  }

  // Salad & Bowls
  if (text.includes("salad") || text.includes("bowl")) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600";
  }

  // Default appetizing cafe dish image
  return "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600";
}
