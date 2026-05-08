import type { MenuCategory } from "../menu";

/**
 * Kohinoor North Indian Restaurant (The Waterfront, Kota Kinabalu).
 * Source: foodpanda listing captured 8 May 2026.
 * Modifiers (spice level, side choice) aren't surfaced on Foodpanda — items
 * render as plain price-only entries, which the existing FowlBoys-shaped
 * MenuItem schema handles fine (no `combo` / `heatOnly` flags set).
 *
 * Source-noted dedup: Lentils duplicates (small/large prices) collapsed to
 * single entries at the higher price; the second "Palak Non Vege" section
 * dropped (same items as "Palak Non Vegetable").
 */

const IMG = {
  curry:
    "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=1000&q=80&auto=format&fit=crop",
  butterChicken:
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1000&q=80&auto=format&fit=crop",
  naan:
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1000&q=80&auto=format&fit=crop",
  biryani:
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&q=80&auto=format&fit=crop",
  tandoori:
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=1000&q=80&auto=format&fit=crop",
  pakora:
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1000&q=80&auto=format&fit=crop",
  lassi:
    "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1000&q=80&auto=format&fit=crop",
};

export const KOHINOOR_MENU: MenuCategory[] = [
  {
    id: "appetizer",
    name: "Appetizer",
    items: [
      {
        id: "ko-app-papadum",
        name: "Papadum",
        description:
          "Crispy, crunchy lentil cracker, perfect for snacking.",
        price: 5.5,
      },
      {
        id: "ko-app-masala-papadum",
        name: "Masala Papadum",
        description:
          "Crisp pappadum topped with juicy onions, tomatoes, chillies, herbs, and a sprinkle of chaat masala.",
        price: 10.9,
      },
      {
        id: "ko-app-roasted-papadum",
        name: "Roasted Papadum",
        description:
          "All the crunch, none of the guilt — roasted to smoky, crispy perfection.",
        price: 8.9,
      },
    ],
  },
  {
    id: "salads",
    name: "Salads",
    items: [
      {
        id: "ko-salad-harley",
        name: "Harley",
        description:
          "A hearty, wholesome salad featuring pearl barley, tossed with fresh greens and cherry tomatoes.",
        price: 11.9,
      },
      {
        id: "ko-salad-paneer",
        name: "Paneer Salad",
        description:
          "Grilled Indian cottage cheese cubes served over a bed of crisp vegetables, with a tangy dressing.",
        price: 17.9,
      },
      {
        id: "ko-salad-ketumbar",
        name: "Ketumbar",
        description:
          "Fresh coriander leaves mixed with onions, tomatoes, cucumbers and a zesty lemon dressing.",
        price: 11.9,
      },
      {
        id: "ko-salad-chicken",
        name: "Chicken Salad",
        description:
          "Juicy grilled chicken strips on a fresh garden salad, finished with classic spicy dressing.",
        price: 18.9,
      },
    ],
  },
  {
    id: "tandoori-bone",
    name: "Chicken Tandoori (with bone)",
    items: [
      {
        id: "ko-tand-half",
        name: "Half Chicken Tandoori",
        description:
          "Tandoori chicken cooked in tandoori masala, served with mint chutney.",
        price: 34.9,
        image: IMG.tandoori,
      },
      {
        id: "ko-tand-drumsticks",
        name: "Tandoori Drumsticks",
        description:
          "Two pieces of chicken drumsticks marinated with yogurt and tandoori masala.",
        price: 14.9,
      },
      {
        id: "ko-tand-leg",
        name: "Tandoori Leg",
        description:
          "Juicy chicken leg richly marinated in bold spices, tandoor-roasted to perfection. Finished with fresh herbs.",
        price: 19.9,
      },
      {
        id: "ko-tand-full",
        name: "Full Tandoori Chicken",
        description:
          "A whole chicken infused with aromatic spices and roasted to smoky tenderness in a tandoor.",
        price: 41.27,
      },
    ],
  },
  {
    id: "tikka-boneless",
    name: "Chicken Tikka (boneless)",
    items: [
      {
        id: "ko-tikka-basic",
        name: "Chicken Tikka",
        description:
          "Classic boneless chicken pieces marinated in spiced yogurt, skewered and grilled over flame.",
        price: 25.9,
      },
      {
        id: "ko-tikka-cheese",
        name: "Chicken Cheese Tikka",
        description:
          "Juicy chicken chunks marinated with spiced yogurt and stuffed with rich melted cheese, grilled until smoky.",
        price: 28.9,
      },
      {
        id: "ko-tikka-garlic",
        name: "Chicken Garlic Tikka",
        description:
          "Tender chicken cubes marinated in a fragrant garlic-infused yoghurt blend, roasted over flame.",
        price: 28.9,
      },
      {
        id: "ko-tikka-pahadi",
        name: "Chicken Pahadi Tikka",
        description:
          "Chicken marinated with fresh herbs, mint, coriander and green chillies, grilled until juicy and aromatic.",
        price: 27.9,
      },
      {
        id: "ko-tikka-mixed",
        name: "Mixed Chicken Tikka",
        description:
          "A platter of assorted chicken tikka varieties (classic, cheese, garlic and pahadi). Perfect for sharing.",
        price: 38.9,
        image: IMG.tandoori,
      },
    ],
  },
  {
    id: "fish-tikka",
    name: "Fish Tikka",
    items: [
      {
        id: "ko-fish-tikka",
        name: "Fish Tikka",
        description:
          "Tender chunks of fish marinated in a spiced yoghurt blend, skewered and tandoor-grilled to a smoky finish.",
        price: 28.9,
      },
      {
        id: "ko-fish-pahadi",
        name: "Fish Pahadi Tikka",
        description:
          "Fresh fish marinated in a vibrant green herb paste of mint, coriander and green chillies, then flame-grilled.",
        price: 29.9,
      },
      {
        id: "ko-fish-lasooni",
        name: "Lasooni Fish Tikka",
        description:
          "Delicate fish pieces infused with garlic-spiced yoghurt marinade, flame-grilled for bold and aromatic flavour.",
        price: 31.9,
      },
    ],
  },
  {
    id: "veg-tandoor",
    name: "Vegetarian Tandoor",
    items: [
      {
        id: "ko-vegtand-aloo-tikki",
        name: "Aloo Tikki",
        description:
          "Crispy spiced potato patties, pan-fried to golden perfection.",
        price: 19.9,
      },
      {
        id: "ko-vegtand-paneer-tikka",
        name: "Paneer Tikka",
        description:
          "Chunks of cottage cheese marinated in a spiced yoghurt blend, skewered and grilled until lightly charred.",
        price: 24.9,
      },
      {
        id: "ko-vegtand-hariyali",
        name: "Hariyali Paneer Tikka",
        description:
          "Paneer cubes marinated in mint, coriander and spices, then grilled to perfection.",
        price: 26.9,
      },
    ],
  },
  {
    id: "signature",
    name: "Signature Dishes",
    items: [
      {
        id: "ko-sig-butter-chicken",
        name: "Butter Chicken",
        description:
          "Boneless chicken in creamy buttery tomato sauce.",
        price: 31.9,
        badge: "Signature",
        image: IMG.butterChicken,
      },
      {
        id: "ko-sig-butter-chicken-bone",
        name: "Butter Chicken with bones",
        description:
          "Our hot-selling butter chicken, ordered with chicken thigh pieces.",
        price: 26.9,
      },
      {
        id: "ko-sig-rogan-josh",
        name: "Mutton Rogan Josh",
        description:
          "Succulent boneless mutton in rich rogan gravy.",
        price: 35.9,
        image: IMG.curry,
      },
    ],
  },
  {
    id: "korma",
    name: "Korma",
    items: [
      {
        id: "ko-korma-chicken",
        name: "Chicken Korma",
        description:
          "Tender chicken simmered in a rich and creamy sauce of yoghurt, cashew nuts and aromatic spices.",
        price: 30.9,
      },
      {
        id: "ko-korma-mutton",
        name: "Mutton Korma",
        description:
          "Slow-cooked mutton in a luxurious, mildly spiced yoghurt and cashew nut gravy.",
        price: 34.9,
      },
    ],
  },
  {
    id: "green-curry",
    name: "Green Curry",
    items: [
      {
        id: "ko-green-chicken",
        name: "Chicken Green Curry",
        description:
          "Tender chicken cooked in a fragrant green curry of fresh herbs, green chillies and coconut.",
        price: 28.9,
        image: IMG.curry,
      },
      {
        id: "ko-green-mutton",
        name: "Mutton Green Curry",
        description:
          "Slow-cooked mutton simmered in a rich, spicy green curry infused with coconut milk and herbs.",
        price: 32.9,
      },
    ],
  },
  {
    id: "do-piaza",
    name: "Do Piaza",
    items: [
      {
        id: "ko-dopiaza-chicken",
        name: "Chicken Do Piaza",
        description:
          "Tender chicken cooked with a generous amount of onions, tomatoes and aromatic spices.",
        price: 28.9,
      },
      {
        id: "ko-dopiaza-mutton",
        name: "Mutton Do Piaza",
        description:
          "Succulent mutton slow-cooked with double the onions, spices and a touch of tomato.",
        price: 32.9,
      },
    ],
  },
  {
    id: "khadai",
    name: "Khadai",
    items: [
      {
        id: "ko-khadai-chicken",
        name: "Chicken Khadai",
        description:
          "Chicken pieces cooked in a wok with onions, capsicum, tomatoes and a special blend of spices.",
        price: 28.9,
      },
      {
        id: "ko-khadai-mutton",
        name: "Mutton Khadai",
        description:
          "Tender mutton stir-fried with onions, capsicum, tomatoes and traditional spices.",
        price: 32.9,
      },
    ],
  },
  {
    id: "palak-non-veg",
    name: "Palak Non Vegetable (Cream Spinach)",
    items: [
      {
        id: "ko-palak-chicken",
        name: "Chicken Palak",
        description:
          "Tender chicken cooked in a smooth spinach gravy flavoured with garlic, ginger and mild spices.",
        price: 29.9,
      },
      {
        id: "ko-palak-saag-gosht",
        name: "Mutton Saag Gosht",
        description:
          "Slow-cooked mutton simmered in a rich spinach and mustard-leaf curry with traditional spices.",
        price: 31.9,
      },
    ],
  },
  {
    id: "masala-non-veg",
    name: "Masala Non Vegetable",
    items: [
      {
        id: "ko-masala-tikka-masala",
        name: "Chicken Tikka Masala",
        description:
          "Charbroiled chicken grilled in charcoal, simmered in creamy spicy gravy.",
        price: 30.9,
        image: IMG.butterChicken,
      },
      {
        id: "ko-masala-chicken",
        name: "Chicken Masala",
        description:
          "Spicy fiery chicken masala in onion-based gravy.",
        price: 30.9,
      },
      {
        id: "ko-masala-mutton",
        name: "Mutton Masala",
        description:
          "Spicy and boneless in thick onion gravy.",
        price: 35.9,
      },
      {
        id: "ko-masala-punjabi-chicken",
        name: "Punjabi Chicken Curry",
        description:
          "Chicken curry cooked with onions, tomatoes, yoghurt and robust spices.",
        price: 29.9,
      },
      {
        id: "ko-masala-mirchi",
        name: "Chicken Mirchi",
        description:
          "Spicy chicken curry cooked with a bold blend of green chillies, onions, tomatoes and aromatic spices.",
        price: 25.9,
      },
      {
        id: "ko-masala-manchurian",
        name: "Manchurian Chicken",
        description:
          "Deep-fried chicken coated in Indian sauce.",
        price: 30.9,
      },
      {
        id: "ko-masala-daal-gosht",
        name: "Daal Gosht",
        description:
          "An India favourite cooked with lentils and boneless mutton.",
        price: 32.9,
      },
      {
        id: "ko-masala-lamb-shank",
        name: "Lamb Shank Curry",
        description:
          "Succulent lamb shank in onion-based gravy and spices. Ask for spicy for best taste.",
        price: 37.9,
      },
      {
        id: "ko-masala-keema-mutter",
        name: "Keema Mutter",
        description:
          "Minced mutton cooked with green peas, onions, tomatoes and a fragrant blend of spices.",
        price: 27.9,
      },
      {
        id: "ko-masala-mutton-kofta",
        name: "Mutton Kofta",
        description:
          "Juicy mutton meatballs simmered in a rich and spiced tomato gravy.",
        price: 28.9,
      },
    ],
  },
  {
    id: "vindaloo",
    name: "Vindaloo Dishes",
    items: [
      {
        id: "ko-vin-chicken",
        name: "Chicken Vindaloo",
        description:
          "A South Indian favourite — spicy with curry leaves and roasted spices.",
        price: 31.9,
      },
      {
        id: "ko-vin-mutton",
        name: "Mutton Vindaloo",
        description:
          "Succulent boneless lamb cooked with spices and curry leaves.",
        price: 36.9,
      },
      {
        id: "ko-vin-fish-prawn",
        name: "Fish & Prawn Vindaloo",
        description:
          "Fresh fish and prawns simmered in chillies, vinegar and roasted spices for a tangy and spicy kick.",
        price: 35.9,
      },
      {
        id: "ko-vin-coconut-chicken",
        name: "Spicy Coconut Chicken Curry",
        description:
          "Tender chicken cooked in a rich, creamy coconut gravy infused with green chillies and fragrant spices.",
        price: 28.9,
      },
    ],
  },
  {
    id: "hot-spicy",
    name: "Hot & Spicy Specials",
    items: [
      {
        id: "ko-hot-chili-prawns",
        name: "Chili Prawns",
        description:
          "Cooked with fresh prawns, dry chillies and a touch of pepper.",
        price: 34.9,
      },
      {
        id: "ko-hot-chili-chicken",
        name: "Chili Chicken",
        description:
          "Cooked with dry chillies and a touch of pepper.",
        price: 29.9,
      },
    ],
  },
  {
    id: "seafood",
    name: "Seafood Specialities",
    items: [
      {
        id: "ko-sea-butter-prawn",
        name: "Butter Prawn",
        description:
          "Juicy prawns simmered in a rich butter and tomato gravy.",
        price: 33.9,
      },
      {
        id: "ko-sea-prawn-mirchi",
        name: "Prawn Mirchi",
        description:
          "Prawns cooked with green chillies, onions and tomatoes in a spicy masala.",
        price: 32.9,
      },
      {
        id: "ko-sea-masala-prawn",
        name: "Masala Prawn",
        description:
          "Prawns tossed in a thick onion-tomato masala with traditional spices.",
        price: 34.9,
      },
      {
        id: "ko-sea-dry-fish",
        name: "Dry Masala Fish",
        description:
          "Fish fillets coated in a spiced dry masala, lightly grilled for bold flavour.",
        price: 34.9,
      },
      {
        id: "ko-sea-prawn-hyd",
        name: "Prawn Hyderabadi",
        description:
          "Succulent prawns simmered with coriander, fried onions, yoghurt and green chillies.",
        price: 34.9,
      },
      {
        id: "ko-sea-prawn-dopiaza",
        name: "Prawn Do Piaza",
        description:
          "Prawns cooked with a generous amount of onions, tomatoes and spices.",
        price: 29.9,
      },
      {
        id: "ko-sea-khadai-prawn",
        name: "Khadai Prawn",
        description:
          "Wok-stirred prawns with capsicum, onions, tomatoes and spices.",
        price: 33.9,
      },
      {
        id: "ko-sea-goan-fish",
        name: "Goan Fish Curry",
        description:
          "Fish simmered in a coconut milk gravy with vinegar, chillies and spices. Tangy, slightly spicy.",
        price: 33.9,
      },
      {
        id: "ko-sea-fish-lauri",
        name: "Fish Lauri",
        description:
          "Fish cooked with fresh herbs, onions and tomatoes in a mild spiced gravy.",
        price: 33.9,
      },
      {
        id: "ko-sea-manchurian-fish",
        name: "Manchurian Fish",
        description:
          "Crispy fried fish, lightly coated and tossed in a tangy sauce with peppers.",
        price: 33.9,
      },
      {
        id: "ko-sea-spicy-squid",
        name: "Spicy Squid Masala",
        description:
          "Squid rings stir-fried in a spicy onion and tomato masala.",
        price: 31.9,
      },
      {
        id: "ko-sea-manchurian-squid",
        name: "Manchurian Squid",
        description:
          "Crispy fried squid tossed in a tangy sauce with peppers.",
        price: 31.9,
      },
      {
        id: "ko-sea-black-mussel",
        name: "Black Mussel",
        description:
          "Mussels cooked with onions, tomatoes, garlic and spices.",
        price: 32.9,
      },
      {
        id: "ko-sea-fish-mirchi",
        name: "Fish Mirchi",
        description:
          "Fish cooked with green chillies, onions and tomatoes in a spicy masala.",
        price: 32.9,
      },
      {
        id: "ko-sea-masala-fish",
        name: "Masala Fish",
        description:
          "Cooked in rich onion-based dry gravy. Hearty, robust and mildly thick.",
        price: 34.9,
      },
      {
        id: "ko-sea-fish-hyd",
        name: "Fish Hyderabadi",
        description:
          "Fish cooked with coriander in a creamy green curry.",
        price: 34.9,
      },
      {
        id: "ko-sea-kadai-fish",
        name: "Kadai Fish",
        description:
          "Fish fillets stir-fried with capsicum, onions, tomatoes and spices. Smoky, slightly dry.",
        price: 33.9,
      },
    ],
  },
  {
    id: "veg-corner",
    name: "Vegetarian Corner",
    items: [
      {
        id: "ko-veg-paneer-butter-masala",
        name: "Paneer Butter Masala",
        description:
          "Cottage cheese cubes simmered in a rich tomato and butter gravy.",
        price: 29.9,
        image: IMG.curry,
      },
      {
        id: "ko-veg-vegetable-korma",
        name: "Vegetable Korma",
        description:
          "Mixed vegetables cooked in a creamy, mildly spiced cashew nut and yoghurt gravy.",
        price: 25.9,
      },
      {
        id: "ko-veg-palak-paneer",
        name: "Palak Paneer",
        description:
          "Soft cottage cheese cubes cooked in a smooth spinach gravy with garlic, ginger and mild spices.",
        price: 31.9,
        image: IMG.curry,
      },
      {
        id: "ko-veg-paneer-makhni",
        name: "Paneer Makhni",
        description:
          "Cottage cheese cubes simmered in a luxurious butter and tomato sauce with a hint of cream.",
        price: 29.9,
      },
      {
        id: "ko-veg-khadai-paneer",
        name: "Khadai Paneer",
        description:
          "Cottage cheese cubes tossed with capsicum, onions, tomatoes and spices in a thick masala gravy.",
        price: 28.9,
      },
      {
        id: "ko-veg-mutter-paneer",
        name: "Mutter Paneer",
        description:
          "Cottage cheese cubes and green peas cooked together in a spiced tomato-onion gravy.",
        price: 27.9,
      },
      {
        id: "ko-veg-paneer-korma",
        name: "Paneer Korma",
        description:
          "Cottage cheese cubes cooked in a creamy, mildly spiced yoghurt and cashew nut gravy.",
        price: 28.9,
      },
      {
        id: "ko-veg-aloo-gobi",
        name: "Aloo Gobi",
        description:
          "Potatoes and cauliflower cooked with spices, tomatoes and fresh coriander.",
        price: 25.9,
      },
      {
        id: "ko-veg-aloo-mutter",
        name: "Aloo Mutter",
        description:
          "Potatoes and green peas simmered in a mildly spiced tomato-onion curry.",
        price: 24.9,
      },
      {
        id: "ko-veg-aloo-palak",
        name: "Aloo Palak",
        description:
          "Potatoes cooked in a spiced spinach gravy with garlic and cumin.",
        price: 25.9,
      },
      {
        id: "ko-veg-bombay-aloo",
        name: "Bombay Aloo",
        description:
          "Spiced and tempered potatoes cooked with mustard seeds, curry leaves and mild spices.",
        price: 24.9,
      },
      {
        id: "ko-veg-jeera-aloo",
        name: "Jeera Aloo",
        description:
          "Potatoes tossed with cumin seeds and mild spices.",
        price: 24.9,
      },
      {
        id: "ko-veg-manchurian-gobi",
        name: "Manchurian Gobi",
        description:
          "Crispy cauliflower tossed in a spicy Indo-Chinese style sauce with onions and peppers.",
        price: 25.9,
      },
      {
        id: "ko-veg-channa-masala",
        name: "Channa Masala",
        description:
          "Chickpeas cooked in onion-based gravy with spices. Add pooris for the extra mile.",
        price: 24.9,
      },
      {
        id: "ko-veg-bhindi-masala",
        name: "Bhindi Masala",
        description:
          "Okra stir-fried with onions, tomatoes and traditional spices.",
        price: 24.9,
      },
      {
        id: "ko-veg-korma-mango",
        name: "Vegetable Korma Mango",
        description:
          "Mixed vegetables simmered in a creamy mango-infused cashew nut sauce. Sweet, mildly spiced.",
        price: 26.9,
      },
      {
        id: "ko-veg-khadai-mixed",
        name: "Khadai Mixed Sabzi",
        description:
          "Mixed vegetable in wok-style cooking. Goes well with butter and plain naan.",
        price: 24.9,
      },
      {
        id: "ko-veg-kofta-curry",
        name: "Kofta Curry",
        description:
          "Mixed vegetables simmered in a rich spiced tomato-onion gravy.",
        price: 24.9,
      },
      {
        id: "ko-veg-bhengan-barta",
        name: "Bhengan Barta",
        description:
          "Roasted aubergine mashed and cooked with onions, tomatoes and mild spices.",
        price: 21.9,
      },
    ],
  },
  {
    id: "lentils",
    name: "Lentils",
    items: [
      {
        id: "ko-daal-palak",
        name: "Daal Palak",
        description:
          "Yellow lentils simmered with creamy spinach, garlic and mild spices.",
        price: 26.9,
      },
      {
        id: "ko-daal-punjabi",
        name: "Punjabi Daal Terkawal",
        description:
          "Golden yellow lentils slow-cooked and tempered with cumin, garlic and ghee.",
        price: 24.9,
      },
      {
        id: "ko-daal-makhni",
        name: "Daal Makhni",
        description:
          "Black lentils slow-cooked with spices, butter and cream.",
        price: 25.9,
      },
      {
        id: "ko-daal-terkawali",
        name: "Daal Terkawali",
        description:
          "Hearty yellow lentils finished with a fragrant garlic and cumin tempering.",
        price: 20.9,
      },
    ],
  },
  {
    id: "naan",
    name: "Tandoori Breads — Naan",
    items: [
      {
        id: "ko-naan-cheese",
        name: "Cheese Naan",
        description: "Fluffy naan stuffed with melted cheese.",
        price: 15.9,
      },
      {
        id: "ko-naan-garlic",
        name: "Garlic Naan",
        description:
          "Lightly toasted naan brushed with garlic butter and herbs, fragrant and full of flavour.",
        price: 14.9,
        image: IMG.naan,
      },
      {
        id: "ko-naan-plain",
        name: "Plain Naan",
        description:
          "Classic fluffy naan, light and soft, perfect for scooping up curries.",
        price: 8.0,
      },
      {
        id: "ko-naan-butter",
        name: "Butter Naan",
        description:
          "Traditional naan brushed with butter for a soft, moist and extra-rich finish.",
        price: 8.9,
      },
      {
        id: "ko-naan-basket",
        name: "Naan Basket",
        description: "Plain, garlic and butter naan together.",
        price: 18.9,
        image: IMG.naan,
      },
      {
        id: "ko-naan-kashmiri",
        name: "Kashmiri Naan",
        description:
          "Sweet naan stuffed with dried fruits and nuts. Soft, chewy and full of fruity flavour.",
        price: 14.9,
      },
      {
        id: "ko-naan-paneer-kulcha",
        name: "Paneer Kulcha",
        description: "Stuffed bread with spiced cottage cheese.",
        price: 12.9,
      },
      {
        id: "ko-naan-onion-kulcha",
        name: "Onion Kulcha",
        description: "Stuffed bread filled with mildly spiced onion mixture.",
        price: 12.9,
      },
      {
        id: "ko-naan-keema",
        name: "Keema Naan",
        description: "Stuffed bread with spiced minced mutton.",
        price: 12.5,
      },
      {
        id: "ko-naan-mixed",
        name: "Mixed Naan",
        description: "Soft naan stuffed with a mix of spiced vegetables.",
        price: 14.9,
      },
      {
        id: "ko-roti-butter",
        name: "Butter Roti",
        description:
          "Whole wheat roti brushed with butter. Soft, light and deliciously simple.",
        price: 7.5,
      },
      {
        id: "ko-roti-tandoori",
        name: "Tandoori Roti",
        description:
          "Whole wheat roti cooked in the tandoor, slightly crisp outside and soft inside with a smoky flavour.",
        price: 7.5,
      },
    ],
  },
  {
    id: "chapati",
    name: "Chapati",
    items: [
      {
        id: "ko-chap-puris",
        name: "Puris",
        description: "Two pieces of puri.",
        price: 8.9,
      },
      {
        id: "ko-chap-onion",
        name: "Onion Chapati",
        description: "Two pieces in one set.",
        price: 11.9,
      },
      {
        id: "ko-chap-cheese",
        name: "Cheese Chapati",
        description: "Two pieces in one set.",
        price: 13.9,
      },
      {
        id: "ko-chap-garlic",
        name: "Garlic Chapati",
        description: "Two pieces in one set.",
        price: 12.9,
      },
      {
        id: "ko-chap-tawa",
        name: "Tawa Chapati",
        description: "Two pieces served in one set.",
        price: 8.9,
      },
    ],
  },
  {
    id: "paratha",
    name: "Paratha",
    items: [
      {
        id: "ko-par-egg",
        name: "Paratha with Egg Puree",
        description: "Two pieces.",
        price: 14.9,
      },
      {
        id: "ko-par-plain",
        name: "Plain Paratha",
        description: "Two pieces.",
        price: 12.9,
      },
      {
        id: "ko-par-cheese",
        name: "Cheese Paratha",
        description: "Two pieces in one set.",
        price: 14.9,
      },
      {
        id: "ko-par-onion",
        name: "Onion Paratha",
        description: "Two pieces in one set.",
        price: 13.9,
      },
      {
        id: "ko-par-aloo",
        name: "Aloo Paratha",
        description: "Whole wheat paratha stuffed with spiced mashed potatoes.",
        price: 10.9,
      },
      {
        id: "ko-par-lacha",
        name: "Lacha Paratha",
        description:
          "Layered flaky paratha, crisp outside and soft inside with a light buttery flavour.",
        price: 7.9,
      },
      {
        id: "ko-par-pudina",
        name: "Pudina Paratha",
        description:
          "Flaky paratha infused with fresh mint leaves. Light, refreshing and aromatic.",
        price: 8.9,
      },
    ],
  },
  {
    id: "tandoori-platters",
    name: "Combination Tandoori Platters",
    items: [
      {
        id: "ko-platter-vegetable-tikka",
        name: "Vegetable Tikka Platter",
        description: "Aloo, paneer, tikka and capsicum.",
        price: 37.9,
      },
      {
        id: "ko-platter-mixed-tikka",
        name: "Mixed Tikka Platter",
        description: "Chicken and fish.",
        price: 38.9,
      },
      {
        id: "ko-platter-seafood",
        name: "Seafood Platter",
        description: "Fish tikka, fried prawn and soft-shell crab.",
        price: 63.9,
      },
    ],
  },
  {
    id: "briyani",
    name: "Briyani Specialities",
    items: [
      {
        id: "ko-bri-plain",
        name: "Plain Briyani Set",
        description: "Aromatic basmati served with raita and gravy.",
        price: 19.9,
      },
      {
        id: "ko-bri-vegetables",
        name: "Vegetables Briyani Set",
        description: "Served with raita and gravy.",
        price: 24.9,
      },
      {
        id: "ko-bri-chicken",
        name: "Chicken Briyani Set",
        description: "Served with raita and gravy.",
        price: 29.9,
        image: IMG.biryani,
      },
      {
        id: "ko-bri-mutton",
        name: "Mutton Briyani Set",
        description: "Served with raita and gravy.",
        price: 31.9,
      },
      {
        id: "ko-bri-prawn",
        name: "Prawn Briyani Set",
        description: "Served with raita and gravy.",
        price: 31.9,
      },
      {
        id: "ko-bri-lamb",
        name: "Lamb Shoulder Briyani Set",
        description: "Served with raita and gravy.",
        price: 34.9,
      },
      {
        id: "ko-bri-seafood",
        name: "Seafood Briyani Set",
        description:
          "Mixture of prawn, squid and fish. Comes with gravy and raita.",
        price: 36.9,
      },
      {
        id: "ko-bri-fish",
        name: "Fish Briyani Set",
        description: "Served with raita and gravy.",
        price: 31.9,
      },
    ],
  },
  {
    id: "rice-styles",
    name: "Rice Styles",
    items: [
      {
        id: "ko-rice-saffron",
        name: "Saffron Rice",
        description: "White rice flavoured with saffron.",
        price: 16.9,
      },
      {
        id: "ko-rice-pulao",
        name: "Pulao Rice with Green Peas",
        description: "Basmati rice cooked with green peas and raisins.",
        price: 15.9,
      },
      {
        id: "ko-rice-jeera",
        name: "Jeera Cumin Rice",
        description:
          "Rice with cumin seeds. A popular dish in the Indian subcontinent.",
        price: 15.9,
      },
      {
        id: "ko-rice-basmati",
        name: "Basmati Rice",
        description: "Aromatic plain basmati.",
        price: 8.9,
      },
    ],
  },
  {
    id: "chef-specials",
    name: "Chef Specials",
    items: [
      {
        id: "ko-chef-spicy-chicken",
        name: "Indian Spicy Chicken Rice",
        description:
          "Fried rice cooked with egg and mixed vegetables, served with spicy chicken.",
        price: 19.9,
      },
      {
        id: "ko-chef-vegetarian",
        name: "Vegetarian Chef Special",
        description: "Fried rice cooked with mixed vegetables.",
        price: 16.9,
      },
      {
        id: "ko-chef-chicken",
        name: "Chicken Chef Special",
        description: "Comes with fried rice.",
        price: 18.9,
      },
      {
        id: "ko-chef-egg",
        name: "Egg Chef Special",
        description: "Comes with fried rice.",
        price: 13.9,
      },
      {
        id: "ko-chef-seafood",
        name: "Seafood Chef Special",
        description: "Comes with fried rice.",
        price: 23.9,
      },
    ],
  },
  {
    id: "pakora",
    name: "Pakora",
    items: [
      {
        id: "ko-pak-chicken",
        name: "Chicken Pakora",
        description:
          "Tender chicken pieces coated in spiced batter and fried until golden.",
        price: 16.9,
      },
      {
        id: "ko-pak-calamari",
        name: "Calamari Rings",
        description:
          "Squid rings coated in light batter and fried until crispy. Tender inside.",
        price: 18.9,
      },
      {
        id: "ko-pak-vegetable-platter",
        name: "Vegetable Appetizers Platter",
        description: "Samosa, pakoras, onion bhajis.",
        price: 27.9,
        image: IMG.pakora,
      },
      {
        id: "ko-pak-mixed-vegetable",
        name: "Mixed Vegetable Pakora",
        description:
          "Assorted fresh vegetables coated in a spiced chickpea batter and deep-fried.",
        price: 14.9,
      },
      {
        id: "ko-pak-fish",
        name: "Fish Pakora",
        description:
          "Fish fillets marinated in spices and fried in a crisp chickpea batter — light, flaky and full of flavour.",
        price: 17.9,
      },
      {
        id: "ko-pak-paneer",
        name: "Paneer Pakora",
        description:
          "Chunks of soft cottage cheese dipped in spiced batter and deep-fried.",
        price: 18.9,
      },
      {
        id: "ko-pak-onion-bhaji",
        name: "Onion Bhaji",
        description:
          "Sliced onions mixed with chickpea flour and spices, fried until golden and crisp.",
        price: 16.9,
      },
      {
        id: "ko-pak-spicy-wings",
        name: "Spicy Chicken Wings",
        description: "Chicken wings marinated in spices and fried until crispy.",
        price: 21.9,
      },
      {
        id: "ko-pak-fun-fries",
        name: "Kohinoor Fun Fries",
        description: "Crispy potato fries tossed with a mix of house spices.",
        price: 10.9,
      },
      {
        id: "ko-pak-prawn-fritters",
        name: "Prawn Fritters",
        description: "Juicy prawns dipped in seasoned batter and deep-fried until golden.",
        price: 19.9,
      },
      {
        id: "ko-pak-prawn-koliwada",
        name: "Prawn Koliwada",
        description:
          "Prawns marinated with chilli, ginger and garlic, coated in spiced batter and deep-fried.",
        price: 18.9,
      },
      {
        id: "ko-pak-fish-koliwada",
        name: "Fish Koliwada",
        description:
          "Fish fillets marinated in ginger-garlic paste and spices, fried till crisp.",
        price: 18.9,
      },
      {
        id: "ko-pak-seafood-platter",
        name: "Seafood Appetizer Platter",
        description: "Fish cutlets, prawns and squid rings.",
        price: 38.9,
      },
      {
        id: "ko-pak-soft-shell",
        name: "Soft Shell Crab Deep-fried",
        description:
          "Whole soft-shell crab battered and deep-fried until golden — crispy, juicy and packed with sweet crab flavour.",
        price: 27.9,
      },
    ],
  },
  {
    id: "kebab",
    name: "Kebab Dishes",
    items: [
      {
        id: "ko-keb-chicken",
        name: "Chicken Kebab",
        description:
          "Tender chicken pieces marinated in yoghurt and spices, grilled until smoky and juicy.",
        price: 23.9,
        image: IMG.tandoori,
      },
      {
        id: "ko-keb-mutton",
        name: "Mutton Kebab",
        description:
          "Succulent mutton chunks mixed with spices and grilled over open flames.",
        price: 26.9,
      },
      {
        id: "ko-keb-mixed",
        name: "Kebab Mixed Platter",
        description:
          "A selection of chicken and mutton kebabs grilled to perfection.",
        price: 43.9,
      },
      {
        id: "ko-keb-prawn-shaslik",
        name: "Prawn Shaslik",
        description:
          "Prawns skewered with peppers, onions and tomatoes, grilled with spiced marinade.",
        price: 42.9,
      },
      {
        id: "ko-keb-cheese-prawn",
        name: "Cheese Prawn Shaslik",
        description:
          "Prawns and peppers skewered and grilled, finished with melted cheese.",
        price: 46.9,
      },
      {
        id: "ko-keb-lasooni",
        name: "Lasooni Kebab",
        description: "Marinated with garlic, yoghurt and spices, then grilled.",
        price: 45.9,
      },
    ],
  },
  {
    id: "raita",
    name: "Raita, Chutneys & Pickles",
    items: [
      {
        id: "ko-raita-plain",
        name: "Plain Raita",
        description: "Smooth yoghurt lightly seasoned with salt and cumin.",
        price: 4.9,
      },
      {
        id: "ko-raita-onion",
        name: "Onion Raita",
        description: "Chopped onions mixed with creamy yoghurt and mild spices.",
        price: 5.9,
      },
      {
        id: "ko-raita-cucumber",
        name: "Cucumber Raita",
        description: "Grated cucumber folded into seasoned yoghurt.",
        price: 5.9,
      },
      {
        id: "ko-raita-mint",
        name: "Mint Chutney",
        description:
          "Fresh mint blended with coriander, green chillies, lemon and spices.",
        price: 3.5,
      },
      {
        id: "ko-raita-mango-chutney",
        name: "Mango Chutney",
        description: "Sweet mango puree cooked with spices and sugar.",
        price: 3.9,
      },
      {
        id: "ko-raita-mixed",
        name: "Mixed Pickle",
        description:
          "Savoury blend of seasoned vegetables and spices.",
        price: 6.9,
      },
      {
        id: "ko-raita-sliced-onion",
        name: "Sliced Onion",
        description:
          "Fresh onion slices marinated in vinegar, spices and lemon.",
        price: 3.9,
      },
      {
        id: "ko-raita-plain-gravy",
        name: "Plain Gravy",
        description: "Serving of plain curry gravy.",
        price: 5.9,
      },
    ],
  },
  {
    id: "pastry",
    name: "Pastry",
    items: [
      {
        id: "ko-pas-vegetable-samosa",
        name: "Vegetable Samosa",
        description: "Four pieces.",
        price: 14.9,
      },
      {
        id: "ko-pas-mixed-samosa",
        name: "Mixed Samosa",
        description: "Three meat samosas and three vegetable samosas.",
        price: 24.9,
      },
      {
        id: "ko-pas-meat-samosa",
        name: "Meat Samosa",
        description: "Four pieces.",
        price: 16.9,
      },
    ],
  },
  {
    id: "desserts",
    name: "Desserts Corner",
    items: [
      {
        id: "ko-des-sugar-syrup",
        name: "Sugar Syrup",
        description:
          "Sugar syrup lightly flavoured with cardamom and rose water.",
        price: 6.9,
      },
      {
        id: "ko-des-sugar-syrup-ic",
        name: "Sugar Syrup with Ice Cream",
        description: "Chilled sugar syrup paired with creamy vanilla ice cream.",
        price: 8.9,
      },
      {
        id: "ko-des-rasgulla",
        name: "Rasgulla",
        description:
          "Two pieces of soft, spongy cottage cheese balls soaked in light sugar syrup.",
        price: 7.5,
      },
      {
        id: "ko-des-rasgulla-ic",
        name: "Rasgulla with Ice Cream",
        description:
          "Two soft, spongy cottage cheese balls soaked in syrup, served with vanilla ice cream.",
        price: 8.9,
      },
      {
        id: "ko-des-gajar-halwa",
        name: "Gajar Halwa",
        description:
          "Grated carrots slow-cooked with milk, sugar and ghee, flavoured with cardamom and nuts.",
        price: 7.9,
      },
    ],
  },
  {
    id: "kulfi",
    name: "Kulfi",
    items: [
      {
        id: "ko-kulfi-coconut",
        name: "Coconut Kulfi",
        description:
          "Kulfi flavoured with coconut milk and flakes. Light, tropical and delicately rich.",
        price: 9.9,
      },
      {
        id: "ko-kulfi-plain",
        name: "Plain Kulfi with Topping",
        description:
          "Ice cream made with thickened milk and nuts, topped with crushed pistachios.",
        price: 8.9,
      },
      {
        id: "ko-kulfi-almond",
        name: "Almond Kulfi",
        description:
          "Kulfi blended with roasted almonds and creamy milk. Nutty and smooth.",
        price: 9.9,
      },
      {
        id: "ko-kulfi-mango",
        name: "Mango Kulfi",
        description:
          "Kulfi infused with fresh mango puree for a fruity tropical flavour.",
        price: 9.9,
      },
      {
        id: "ko-kulfi-fruit-yogurt",
        name: "Fruit Salad with Yogurt",
        description: "Fresh seasonal fruits served with creamy yoghurt.",
        price: 11.9,
      },
      {
        id: "ko-kulfi-fruit-ic",
        name: "Fruit Salad with Ice Cream",
        description: "Seasonal fruits topped with a scoop of vanilla ice cream.",
        price: 10.9,
      },
      {
        id: "ko-kulfi-fruit-platter",
        name: "Fruit Platter",
        description: "An assortment of freshly cut seasonal fruits.",
        price: 9.9,
      },
    ],
  },
  {
    id: "beverages",
    name: "Beverages",
    items: [
      {
        id: "ko-bev-plain-lassi",
        name: "Plain Lassi",
        description:
          "Traditional Indian yoghurt drink — smooth, creamy yet refreshing.",
        price: 10.9,
        image: IMG.lassi,
      },
      {
        id: "ko-bev-strawberry-lassi",
        name: "Strawberry Lassi",
        description: "Sweet yoghurt blended with fresh strawberry puree.",
        price: 12.9,
      },
      {
        id: "ko-bev-jal-jeera",
        name: "Jal Jeera",
        description:
          "A traditional spiced cumin-water drink — tangy, spicy and refreshing.",
        price: 14.9,
      },
      {
        id: "ko-bev-lime-juice",
        name: "Lime Juice",
        description:
          "Freshly squeezed lime mixed with sugar and water. Zesty and refreshing.",
        price: 10.9,
      },
      {
        id: "ko-bev-lime-soda",
        name: "Lime Soda",
        description: "Fresh lime juice topped with soda water.",
        price: 12.9,
      },
      {
        id: "ko-bev-tea",
        name: "Tea",
        description: "Freshly brewed black tea.",
        price: 8.9,
      },
      {
        id: "ko-bev-honey-lemon",
        name: "Honey with Lemon",
        description: "Water infused with honey and fresh lemon.",
        price: 9.9,
      },
      {
        id: "ko-bev-iced-lemon",
        name: "Iced Lemon with Honey",
        description: "Chilled water blended with lemon and honey.",
        price: 10.9,
      },
      {
        id: "ko-bev-sparkling",
        name: "Sparkling Water",
        description: "Light, fizzy and refreshing.",
        price: 7.9,
      },
      {
        id: "ko-bev-mineral",
        name: "Mineral Water",
        description: "Pure and hydrating.",
        price: 4.9,
      },
      {
        id: "ko-bev-masala-tea",
        name: "Masala Tea",
        description: "Traditional Indian chai brewed with spices and milk.",
        price: 8.9,
      },
      {
        id: "ko-bev-haldi-chai",
        name: "Golden Haldi Chai",
        description: "Turmeric-infused chai blended with spices and milk.",
        price: 10.9,
      },
      {
        id: "ko-bev-almond-milk",
        name: "Almond Drink",
        description: "Milk blended with almonds, cardamom and saffron.",
        price: 13.9,
      },
      {
        id: "ko-bev-iced-coffee",
        name: "Iced Indian Coffee",
        description: "Strong Indian coffee brewed and chilled with milk.",
        price: 14.9,
      },
      {
        id: "ko-bev-iced-lemonade",
        name: "Iced Lemonade",
        description:
          "Freshly squeezed lemon juice blended with sugar and ice.",
        price: 10.9,
      },
      {
        id: "ko-bev-fresh-juice",
        name: "Freshly Squeezed Juice",
        description: "Selection of fresh juices made to order.",
        price: 10.9,
      },
      {
        id: "ko-bev-chilled-juice",
        name: "Chilled Juice",
        description: "Selection of chilled juices made to order.",
        price: 9.9,
      },
      {
        id: "ko-bev-sweet-lassi",
        name: "Sweet Lassi",
        description: "Sweetened yoghurt drink blended until smooth.",
        price: 10.9,
      },
      {
        id: "ko-bev-savoury-lassi",
        name: "Savoury Lassi",
        description: "Lightly salted yoghurt drink.",
        price: 10.9,
      },
      {
        id: "ko-bev-mango-lassi",
        name: "Mango Lassi",
        description:
          "Traditional sweet lassi blended with fresh mango puree and yoghurt.",
        price: 12.9,
        image: IMG.lassi,
      },
    ],
  },
];
