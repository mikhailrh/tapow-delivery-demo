import type { MenuCategory } from "../menu";

/**
 * Bar Abong (Kota Kinabalu Waterfront, Sabah).
 * Source: in-house menu image bar-abong-menu-170526.webp — transcribed literally.
 * Menu typos preserved verbatim ("cesar", "vanila", "AVAILBILITY").
 *
 * The opening snacks block and the closing desserts block are ungrouped on the
 * printed menu (no section header). Carried here as categories with empty
 * `name` strings so the section structure is preserved without inventing tidy
 * "Starters" / "Desserts" labels. MenuScreen + SearchOverlay skip rendering
 * headers when name is empty.
 *
 * ▲ items contain alcohol — flagged via `containsAlcohol: true`.
 */

export const BAR_ABONG_MENU: MenuCategory[] = [
  {
    id: "snacks",
    name: "",
    items: [
      {
        id: "ba-green-bean-fries",
        name: "Green Bean Fries",
        description: "crushed anchovies / seaweed / toum",
        price: 18,
      },
      {
        id: "ba-jicama-squid-ball",
        name: "Jicama Squid Ball",
        description: "Japanese spicy citrus aioli / togarashi pepper",
        price: 16,
        containsAlcohol: true,
      },
      {
        id: "ba-cheese-puff",
        name: "Cheese Puff",
        description: "feta / cheddar / mozzarella / caramelized onions",
        price: 18,
      },
      {
        id: "ba-hinava",
        name: "Hinava",
        description:
          "local style ceviche / tengiri fish (SUBJECT TO AVAILBILITY)",
        price: 15,
      },
    ],
  },
  {
    id: "land",
    name: "Land",
    items: [
      {
        id: "ba-broccoli-caesar",
        name: "Broccoli Caesar",
        description: "cesar dressing / parmesan",
        price: 30,
      },
      {
        id: "ba-citrus-kale-salad",
        name: "Citrus Kale Salad",
        description:
          "locally sourced kale grown just around the corner / pomelo / orange / citrus dressing",
        price: 28,
      },
      {
        id: "ba-kundasang-asparagus",
        name: "Kundasang Asparagus",
        description: "Signal hill organic eggs / mustard sauce",
        price: 30,
      },
      {
        id: "ba-soba-pesto",
        name: "Soba Pesto",
        description: "buckwheat noodle / pesto / parmesan / kulim oil",
        price: 28,
      },
      {
        id: "ba-charred-miso-cabbage",
        name: "Charred Miso Cabbage",
        description: "miso glaze / kulim oil / seeds",
        price: 28,
        containsAlcohol: true,
      },
      {
        id: "ba-chili-eggplant",
        name: "Chili Eggplant",
        description: "chili oil / toum / coriander",
        price: 23,
        containsAlcohol: true,
      },
      {
        id: "ba-ma-jang-pasta",
        name: "Ma Jang Pasta",
        description: "peanut butter / sesame sauce / chili oil",
        price: 25,
        containsAlcohol: true,
      },
      {
        id: "ba-barrio-white-rice",
        name: "Barrio White Rice",
        description: "low yield high elevation village rice",
        price: 6,
      },
    ],
  },
  {
    id: "sea",
    name: "Sea",
    items: [
      {
        id: "ba-crab-tamago",
        name: "Crab Tamago",
        description: "Signal Hill organic eggs / local crab",
        price: 68,
      },
      {
        id: "ba-anchovy-lemon-pasta",
        name: "Anchovy Lemon Pasta",
        description: "mediterranean anchovies / butter / parsley",
        price: 26,
      },
      {
        id: "ba-trevally-bambangan",
        name: "Trevally Bambangan",
        description: "slice fish / umami wild mango sauce",
        price: 38,
      },
      {
        id: "ba-ebi-sando",
        name: "Ebi Sando",
        description:
          "prawn mixture / house baked sourdough / egg salad / lettuce",
        price: 53,
      },
      {
        id: "ba-local-sole",
        name: "Local Sole",
        description: "whole fish / buttery caper sauce / dill",
        price: 72,
      },
      {
        id: "ba-fish-sandwich",
        name: "Fish Sandwich",
        description:
          "local catch tengiri / house baked sourdough / abong coleslaw / tartar",
        price: 36,
      },
      {
        id: "ba-grilled-uji-rashid",
        name: "Grilled Uji Rashid",
        description: "2 whole fish grill fish / sambal tuhau",
        price: 28,
      },
      {
        id: "ba-stingray-sambal",
        name: "Stingray Sambal",
        description: "sambal belacan / baby gem bulb",
        price: 33,
      },
      {
        id: "ba-lobster-quiche",
        name: "Lobster Quiche",
        description: "Borneo lobster / kulim oil",
        price: 95,
      },
    ],
  },
  {
    id: "desserts",
    name: "",
    items: [
      {
        id: "ba-abong-pudding",
        name: "Abong Pudding",
        description: "coconut milk panna cotta / gula melaka / sagu pearls",
        price: 15,
      },
      {
        id: "ba-bread-pudding",
        name: "Bread Pudding",
        description:
          "house baked sourdough/ mascarpone / vanila ice cream / honey",
        price: 25,
      },
      {
        id: "ba-local-cheese-plate",
        name: "Local Cheese Plate",
        description:
          "brie / camembert / feta / local honey / olive tapenade / house baked sourdough",
        price: 55,
      },
    ],
  },
  {
    id: "drinks",
    name: "Drinks",
    note: "Bottles displayed in fridge / By the glass displayed on the board",
    items: [
      {
        id: "ba-watermelon-kasturi",
        name: "Watermelon Kasturi",
        description: "juice / calamansi lime",
        price: 15,
      },
      {
        id: "ba-apple-assam",
        name: "Apple Assam",
        description: "juice / dried sour plum",
        price: 18,
      },
      {
        id: "ba-calamansi-soda",
        name: "Calamansi Soda",
        description: "soda / sour plum.",
        price: 12,
      },
    ],
  },
];
