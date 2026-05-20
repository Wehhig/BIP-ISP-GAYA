import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Screen = "home" | "add" | "profile";
type OwnerFilter = "all" | "others" | "mine";
type PickupFilter = string | null;
type SortOption = "recommended" | "nearest" | "tokens" | "rating";
type RequestStatus = "Pending" | "Accepted" | "Returned";
type AvailabilityFilter = "all" | "today";

type Item = {
  id: number;
  title: string;
  category: string;
  tokens: number;
  distance: string;
  rating: number;
  owner: string;
  verified: boolean;
  deposit: boolean;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  pickupLocation: string;
  availability: string;
  imageColors: readonly [string, string];
  swaps?: number;
  condition?: string;
  isPaused?: boolean;
};

type BorrowRequest = {
  id: number;
  itemId: number;
  itemTitle: string;
  owner: string;
  tokens: number;
  status: RequestStatus;
  date: string;
  duration: string;
  pickupLocation: string;
};

type OwnerRental = {
  id: number;
  itemId: number;
  itemTitle: string;
  borrower: string;
  borrowerEmail: string;
  tokensEarned: number;
  status: "Active" | "Returned";
  borrowedAt: string;
  dueDate: string;
  duration: string;
  pickupLocation: string;
};

type NewItemInput = {
  title: string;
  category: string;
  tokens: number;
  description: string;
  pickupLocation: string;
  availability: string;
  deposit: boolean;
};

type ChatMessage = {
  id: number;
  from: "me" | "owner";
  text: string;
  time: string;
};

type Conversation = {
  id: number;
  owner: string;
  itemTitle: string;
  itemId: number;
  messages: ChatMessage[];
};

type TokenEvent = {
  id: number;
  title: string;
  amount: number;
  type: "earned" | "reserved" | "refunded" | "bonus";
  date: string;
};

type NotificationItem = {
  id: number;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  date: string;
};

type Review = {
  id: number;
  itemId: number;
  author: string;
  text: string;
  rating: number;
  date: string;
};

type PersistedAppState = {
  itemList: Item[];
  tokenBalance: number;
  borrowRequests: BorrowRequest[];
  ownerRentals: OwnerRental[];
  favoriteIds: number[];
  conversations: Conversation[];
  tokenEvents: TokenEvent[];
  dailyBonusClaimed: boolean;
  notifications: NotificationItem[];
  hasCompletedOnboarding: boolean;
  isVerifiedStudent: boolean;
  verifiedEmail: string;
  reviews: Review[];
};

const STORAGE_KEY = "@studswap_demo_state_v1";
const currentUserName = "Mock Student";

const logoSymbol = require("../../assets/images/studswap-symbol.png");
const logoWordmark = require("../../assets/images/studswap-wordmark.png");

const categories = ["All", "Audiovisual", "Prototyping", "Dress", "Study"];
const addCategories = ["Audiovisual", "Prototyping", "Dress", "Study"];

const durationOptions = [
  { label: "1 day", multiplier: 1 },
  { label: "3 days", multiplier: 2 },
  { label: "1 week", multiplier: 4 },
];

const pickupOptions = [
  "Main Library",
  "Engineering Building",
  "Student Dorm A",
  "Campus Café",
];

const availabilityOptions = [
  "Available today",
  "Available tomorrow",
  "Available this week",
  "Weekend only",
];

const maxTokenOptions = [5, 10, 15];

const sortOptions: { label: string; value: SortOption; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Recommended", value: "recommended", icon: "sparkles" },
  { label: "Nearest", value: "nearest", icon: "location" },
  { label: "Cheapest", value: "tokens", icon: "diamond" },
  { label: "Top rated", value: "rating", icon: "star" },
];

const mockBorrowers = [
  { name: "Clara", email: "clara@university.pt" },
  { name: "Miguel", email: "miguel@university.pt" },
  { name: "Nina", email: "nina@university.pt" },
  { name: "Tomas", email: "tomas@university.pt" },
];

const initialItems: Item[] = [
  {
    id: 1,
    title: "4K Camera Kit",
    category: "Audiovisual",
    tokens: 12,
    distance: "0.8 km",
    rating: 4.9,
    owner: "Marta",
    verified: true,
    deposit: true,
    description:
      "A compact 4K camera kit for student projects, interviews, promo videos and content creation.",
    icon: "camera",
    pickupLocation: "Main Library",
    availability: "Available today",
    imageColors: ["#2D5BFF", "#66D9FF"],
  },
  {
    id: 2,
    title: "Arduino Starter Kit",
    category: "Prototyping",
    tokens: 8,
    distance: "1.2 km",
    rating: 4.8,
    owner: "João",
    verified: true,
    deposit: true,
    description:
      "Perfect for quick prototypes, electronics classes and hackathon demos.",
    icon: "hardware-chip",
    pickupLocation: "Engineering Building",
    availability: "Available tomorrow",
    imageColors: ["#0F766E", "#B8F2A2"],
  },
  {
    id: 3,
    title: "Interview Blazer",
    category: "Dress",
    tokens: 6,
    distance: "0.5 km",
    rating: 4.7,
    owner: "Sofia",
    verified: true,
    deposit: false,
    description:
      "Smart blazer for job interviews, presentations and professional meetings.",
    icon: "shirt",
    pickupLocation: "Campus Café",
    availability: "Available this week",
    imageColors: ["#171316", "#FF7048"],
  },
  {
    id: 4,
    title: "Podcast Microphone",
    category: "Audiovisual",
    tokens: 10,
    distance: "1.6 km",
    rating: 4.9,
    owner: "Alex",
    verified: true,
    deposit: true,
    description:
      "USB microphone for podcasts, presentations, online interviews and university recordings.",
    icon: "mic",
    pickupLocation: "Media Lab",
    availability: "Available today",
    imageColors: ["#7C3AED", "#2D5BFF"],
  },
  {
    id: 5,
    title: "Tripod Stand",
    category: "Audiovisual",
    tokens: 5,
    distance: "2.1 km",
    rating: 4.6,
    owner: "Emma",
    verified: true,
    deposit: false,
    description:
      "Lightweight tripod for filming, photography and group project presentations.",
    icon: "aperture",
    pickupLocation: "Student Dorm A",
    availability: "Available today",
    imageColors: ["#FF7048", "#FFD166"],
  },
  {
    id: 6,
    title: "Laptop Stand",
    category: "Study",
    tokens: 4,
    distance: "0.9 km",
    rating: 4.8,
    owner: "Daniel",
    verified: true,
    deposit: false,
    description:
      "Portable laptop stand for studying, coding sessions and remote meetings.",
    icon: "laptop",
    pickupLocation: "Main Library",
    availability: "Available today",
    imageColors: ["#2D5BFF", "#B8F2A2"],
  },
];

const initialTokenEvents: TokenEvent[] = [
  {
    id: 1001,
    title: "Welcome bonus",
    amount: 42,
    type: "bonus",
    date: "Today",
  },
];

const initialNotifications: NotificationItem[] = [
  {
    id: 2001,
    title: "Welcome to Stud&Swap",
    text: "Your profile is verified and you received a starter token bonus.",
    icon: "checkmark-circle",
    date: "Today",
  },
];

const sellerGreetings = [
  "Hi! Thanks for your interest. The item is still available.",
  "Hello! I can lend it this week if that works for you.",
  "Hey! Sure, we can arrange a pickup on campus.",
  "Hi there! Let me know when you would like to borrow it.",
];

const sellerReplies = [
  "Sounds good!",
  "Yes, that should work for me.",
  "Perfect, we can meet near the main campus entrance.",
  "Great! I will keep it reserved for you.",
  "No problem, message me when you are ready.",
];

const chatQuickQuestions = [
  "Is the item available?",
  "Where can I collect it?",
  "When can I collect it?",
  "How many tokens is it?",
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recommended");
  const [selectedPickupFilter, setSelectedPickupFilter] = useState<PickupFilter>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [borrowSummaryItem, setBorrowSummaryItem] = useState<Item | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [itemList, setItemList] = useState<Item[]>(initialItems);
  const [tokenBalance, setTokenBalance] = useState(42);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [ownerRentals, setOwnerRentals] = useState<OwnerRental[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tokenEvents, setTokenEvents] = useState<TokenEvent[]>(initialTokenEvents);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isVerifiedStudent, setIsVerifiedStudent] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingTarget, setRatingTarget] = useState<BorrowRequest | null>(null);
  const [maxTokensFilter, setMaxTokensFilter] = useState<number | null>(null);
  const [depositOnly, setDepositOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPersistedState = async () => {
      try {
        const rawState = await AsyncStorage.getItem(STORAGE_KEY);

        if (!rawState) {
          return;
        }

        const savedState = JSON.parse(rawState) as Partial<PersistedAppState>;

        if (!isMounted) {
          return;
        }

        if (Array.isArray(savedState.itemList)) {
          setItemList(savedState.itemList);
        }

        if (typeof savedState.tokenBalance === "number") {
          setTokenBalance(savedState.tokenBalance);
        }

        if (Array.isArray(savedState.borrowRequests)) {
          setBorrowRequests(savedState.borrowRequests);
        }

        if (Array.isArray(savedState.ownerRentals)) {
          setOwnerRentals(savedState.ownerRentals);
        }

        if (Array.isArray(savedState.favoriteIds)) {
          setFavoriteIds(savedState.favoriteIds);
        }

        if (Array.isArray(savedState.conversations)) {
          setConversations(savedState.conversations);
        }

        if (Array.isArray(savedState.tokenEvents)) {
          setTokenEvents(savedState.tokenEvents);
        }

        if (typeof savedState.dailyBonusClaimed === "boolean") {
          setDailyBonusClaimed(savedState.dailyBonusClaimed);
        }

        if (Array.isArray(savedState.notifications)) {
          setNotifications(savedState.notifications);
        }

        if (typeof savedState.hasCompletedOnboarding === "boolean") {
          setHasCompletedOnboarding(savedState.hasCompletedOnboarding);
        }

        if (typeof savedState.isVerifiedStudent === "boolean") {
          setIsVerifiedStudent(savedState.isVerifiedStudent);
        }

        if (typeof savedState.verifiedEmail === "string") {
          setVerifiedEmail(savedState.verifiedEmail);
        }

        if (Array.isArray(savedState.reviews)) {
          setReviews(savedState.reviews);
        }
      } catch (error) {
        console.warn("Failed to load Stud&Swap demo state", error);
      } finally {
        if (isMounted) {
          setIsStorageReady(true);
        }
      }
    };

    loadPersistedState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    const stateToPersist: PersistedAppState = {
      itemList,
      tokenBalance,
      borrowRequests,
      ownerRentals,
      favoriteIds,
      conversations,
      tokenEvents,
      dailyBonusClaimed,
      notifications,
      hasCompletedOnboarding,
      isVerifiedStudent,
      verifiedEmail,
      reviews,
    };

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist)).catch(
      (error) => {
        console.warn("Failed to save Stud&Swap demo state", error);
      }
    );
  }, [
    isStorageReady,
    itemList,
    tokenBalance,
    borrowRequests,
    ownerRentals,
    favoriteIds,
    conversations,
    tokenEvents,
    dailyBonusClaimed,
    notifications,
    hasCompletedOnboarding,
    isVerifiedStudent,
    verifiedEmail,
    reviews,
  ]);

  const resetDemoData = async () => {
    setItemList(initialItems);
    setTokenBalance(42);
    setBorrowRequests([]);
    setOwnerRentals([]);
    setFavoriteIds([]);
    setConversations([]);
    setTokenEvents(initialTokenEvents);
    setDailyBonusClaimed(false);
    setNotifications(initialNotifications);
    setHasCompletedOnboarding(false);
    setIsVerifiedStudent(false);
    setVerifiedEmail("");
    setReviews([]);
    setRatingTarget(null);
    setMaxTokensFilter(null);
    setDepositOnly(false);
    setVerifiedOnly(false);
    setAvailableTodayOnly(false);
    setSelectedCategory("All");
    setOwnerFilter("all");
    setSortOption("recommended");
    setSelectedPickupFilter(null);
    setSelectedItem(null);
    setBorrowSummaryItem(null);
    setSelectedConversationId(null);
    setQuery("");
    setScreen("home");

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear Stud&Swap demo state", error);
    }

    Alert.alert("Demo data reset", "The app was restored to the initial demo state.");
  };

  const selectedConversation = useMemo(() => {
    if (selectedConversationId === null) {
      return null;
    }

    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const filteredItems = useMemo(() => {
    let result = itemList;

    if (selectedCategory !== "All") {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (ownerFilter === "mine") {
      result = result.filter((item) => item.owner === currentUserName);
    }

    if (ownerFilter === "others") {
      result = result.filter((item) => item.owner !== currentUserName);
    }

    if (ownerFilter !== "mine") {
      result = result.filter((item) => !item.isPaused);
    }

    if (selectedPickupFilter) {
      result = result.filter((item) => item.pickupLocation === selectedPickupFilter);
    }

    if (maxTokensFilter !== null) {
      result = result.filter((item) => item.tokens <= maxTokensFilter);
    }

    if (depositOnly) {
      result = result.filter((item) => item.deposit);
    }

    if (verifiedOnly) {
      result = result.filter((item) => item.verified);
    }

    if (availableTodayOnly) {
      result = result.filter((item) => item.availability.toLowerCase().includes("today"));
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length > 0) {
      result = result.filter((item) => {
        return (
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.category.toLowerCase().includes(normalizedQuery) ||
          item.owner.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery) ||
          item.pickupLocation.toLowerCase().includes(normalizedQuery)
        );
      });
    }

    const sortedResult = [...result];

    if (sortOption === "nearest") {
      sortedResult.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    }

    if (sortOption === "tokens") {
      sortedResult.sort((a, b) => a.tokens - b.tokens);
    }

    if (sortOption === "rating") {
      sortedResult.sort((a, b) => b.rating - a.rating);
    }

    return sortedResult;
  }, [
    itemList,
    selectedCategory,
    ownerFilter,
    selectedPickupFilter,
    sortOption,
    query,
    maxTokensFilter,
    depositOnly,
    verifiedOnly,
    availableTodayOnly,
  ]);

  const pushNotification = (
    title: string,
    text: string,
    icon: keyof typeof Ionicons.glyphMap = "notifications"
  ) => {
    setNotifications((currentNotifications) => [
      {
        id: Date.now() + Math.random(),
        title,
        text,
        icon,
        date: "Just now",
      },
      ...currentNotifications,
    ]);
  };

  const addNewItem = (newItem: NewItemInput) => {
    const item: Item = {
      id: Date.now(),
      title: newItem.title,
      category: newItem.category,
      tokens: newItem.tokens,
      distance: "0.3 km",
      rating: 5.0,
      owner: currentUserName,
      verified: true,
      deposit: newItem.deposit,
      description:
        newItem.description ||
        "New student listing added in demo mode. In the final app, this would be saved in a database.",
      icon: getIconForCategory(newItem.category),
      pickupLocation: newItem.pickupLocation,
      availability: newItem.availability,
      imageColors: getColorsForCategory(newItem.category),
    };

    setItemList((currentItems) => [item, ...currentItems]);
    setSelectedCategory("All");
    setOwnerFilter("mine");
    setQuery("");
    setScreen("home");

    pushNotification(
      "Listing published",
      `${item.title} is now visible in your campus marketplace.`,
      "add-circle"
    );

    Alert.alert(
      "Item published",
      `${item.title} has been added to your listings. Demo mode will simulate a borrow request in a few seconds.`
    );

    setTimeout(() => {
      const borrower = getRandomItem(mockBorrowers);
      const duration = getRandomItem(durationOptions);
      const dueDate = getDueDateLabel(duration.label);
      const rentalId = Date.now() + Math.random();

      setOwnerRentals((currentRentals) => [
        {
          id: rentalId,
          itemId: item.id,
          itemTitle: item.title,
          borrower: borrower.name,
          borrowerEmail: borrower.email,
          tokensEarned: item.tokens,
          status: "Active",
          borrowedAt: "Just now",
          dueDate,
          duration: duration.label,
          pickupLocation: item.pickupLocation,
        },
        ...currentRentals,
      ]);

      setTokenBalance((currentBalance) => currentBalance + item.tokens);
      setTokenEvents((currentEvents) => [
        {
          id: Date.now() + Math.random(),
          title: `${item.title} borrowed by ${borrower.name}`,
          amount: item.tokens,
          type: "earned",
          date: "Just now",
        },
        ...currentEvents,
      ]);

      pushNotification(
        "New borrower",
        `${borrower.name} borrowed ${item.title} until ${dueDate}.`,
        "people"
      );

      Alert.alert(
        "Tokens earned",
        `${borrower.name} borrowed ${item.title} until ${dueDate}. You earned ${item.tokens} tokens.`
      );
    }, 4500);
  };

  const startBorrowSummary = (item: Item) => {
    if (item.owner === currentUserName) {
      Alert.alert(
        "This is your listing",
        "You cannot borrow an item that you listed yourself."
      );
      return;
    }

    setSelectedItem(null);
    setBorrowSummaryItem(item);
  };

  const confirmBorrow = (item: Item, duration: string, pickupLocation: string, totalTokens: number) => {
    const alreadyRequested = borrowRequests.some(
      (request) =>
        request.itemId === item.id && request.status !== "Returned"
    );

    if (alreadyRequested) {
      Alert.alert(
        "Request already exists",
        `You already have an active request for ${item.title}.`
      );
      return;
    }

    if (tokenBalance < totalTokens) {
      Alert.alert(
        "Not enough tokens",
        `You need ${totalTokens} tokens, but you only have ${tokenBalance}.`
      );
      return;
    }

    const requestId = Date.now();

    const newRequest: BorrowRequest = {
      id: requestId,
      itemId: item.id,
      itemTitle: item.title,
      owner: item.owner,
      tokens: totalTokens,
      status: "Pending",
      date: "Today",
      duration,
      pickupLocation,
    };

    setBorrowRequests((currentRequests) => [newRequest, ...currentRequests]);
    setTokenBalance((currentBalance) => currentBalance - totalTokens);
    setTokenEvents((currentEvents) => [
      {
        id: Date.now() + Math.random(),
        title: `${item.title} request`,
        amount: -totalTokens,
        type: "reserved",
        date: "Today",
      },
      ...currentEvents,
    ]);

    setBorrowSummaryItem(null);
    openConversation(item);

    pushNotification(
      "Borrow request sent",
      `${totalTokens} tokens were reserved for ${item.title}.`,
      "paper-plane"
    );

    Alert.alert(
      "Borrow request sent",
      `Your request for ${item.title} was sent to ${item.owner}. ${totalTokens} tokens are now reserved.`
    );

    setTimeout(() => {
      setBorrowRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId ? { ...request, status: "Accepted" } : request
        )
      );

      pushNotification(
        "Request accepted",
        `${item.owner} accepted your request for ${item.title}.`,
        "checkmark-circle"
      );

      addOwnerMessage(
        item,
        `Accepted! Let's meet at ${pickupLocation}. I will bring ${item.title}.`
      );
    }, 2800);
  };

  const cancelRequest = (requestId: number) => {
    const request = borrowRequests.find((item) => item.id === requestId);

    if (!request || request.status === "Returned") {
      return;
    }

    setBorrowRequests((currentRequests) =>
      currentRequests.filter((item) => item.id !== requestId)
    );

    setTokenBalance((currentBalance) => currentBalance + request.tokens);
    setTokenEvents((currentEvents) => [
      {
        id: Date.now() + Math.random(),
        title: `${request.itemTitle} request cancelled`,
        amount: request.tokens,
        type: "refunded",
        date: "Just now",
      },
      ...currentEvents,
    ]);

    pushNotification(
      "Request cancelled",
      `${request.tokens} tokens were returned to your wallet.`,
      "refresh"
    );

    Alert.alert(
      "Request cancelled",
      `${request.tokens} tokens were returned to your wallet.`
    );
  };

  const markRequestReturned = (requestId: number) => {
    const request = borrowRequests.find((item) => item.id === requestId);

    if (!request || request.status === "Returned") {
      return;
    }

    setBorrowRequests((currentRequests) =>
      currentRequests.map((item) =>
        item.id === requestId ? { ...item, status: "Returned" } : item
      )
    );

    setTokenBalance((currentBalance) => currentBalance + 2);
    setTokenEvents((currentEvents) => [
      {
        id: Date.now() + Math.random(),
        title: `On-time return bonus for ${request.itemTitle}`,
        amount: 2,
        type: "bonus",
        date: "Just now",
      },
      ...currentEvents,
    ]);

    pushNotification(
      "Return completed",
      `You returned ${request.itemTitle} and earned a +2 token bonus.`,
      "return-down-back"
    );

    setRatingTarget(request);
  };

  const submitReview = (request: BorrowRequest, rating: number, text: string) => {
    const cleanText = text.trim();
    const review: Review = {
      id: Date.now() + Math.random(),
      itemId: request.itemId,
      author: currentUserName,
      text: cleanText || "Smooth borrow and easy campus pickup.",
      rating,
      date: "Just now",
    };

    setReviews((currentReviews) => [review, ...currentReviews]);
    setItemList((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== request.itemId) {
          return item;
        }

        const nextRating = Number(((item.rating + rating) / 2).toFixed(1));
        return {
          ...item,
          rating: nextRating,
          swaps: (item.swaps ?? 12) + 1,
        };
      })
    );
    setTokenBalance((currentBalance) => currentBalance + 1);
    setTokenEvents((currentEvents) => [
      {
        id: Date.now() + Math.random(),
        title: `Review bonus for ${request.itemTitle}`,
        amount: 1,
        type: "bonus",
        date: "Just now",
      },
      ...currentEvents,
    ]);
    pushNotification(
      "Review added",
      `Your ${rating}-star review for ${request.itemTitle} was saved. +1 token bonus added.`,
      "star"
    );
    setRatingTarget(null);
    Alert.alert("Review saved", "Thanks! You earned +1 token for rating this swap.");
  };

  const completeOnboarding = (email: string) => {
    setVerifiedEmail(email);
    setIsVerifiedStudent(true);
    setHasCompletedOnboarding(true);
    pushNotification(
      "University email verified",
      `${email} is now connected to this demo account.`,
      "school"
    );
  };

  const markOwnerRentalReturned = (rentalId: number) => {
    const rental = ownerRentals.find((item) => item.id === rentalId);

    if (!rental || rental.status === "Returned") {
      return;
    }

    setOwnerRentals((currentRentals) =>
      currentRentals.map((item) =>
        item.id === rentalId ? { ...item, status: "Returned" } : item
      )
    );

    setTokenBalance((currentBalance) => currentBalance + 1);
    setTokenEvents((currentEvents) => [
      {
        id: Date.now() + Math.random(),
        title: `${rental.borrower} returned ${rental.itemTitle}`,
        amount: 1,
        type: "bonus",
        date: "Just now",
      },
      ...currentEvents,
    ]);

    pushNotification(
      "Listing returned",
      `${rental.borrower} returned ${rental.itemTitle}. You earned +1 reliability bonus.`,
      "ribbon"
    );

    Alert.alert(
      "Listing returned",
      `${rental.borrower} returned ${rental.itemTitle}. You received +1 reliability bonus token.`
    );
  };

  const claimDailyBonus = () => {
    if (dailyBonusClaimed) {
      Alert.alert("Already claimed", "You already claimed today's campus bonus.");
      return;
    }

    setDailyBonusClaimed(true);
    setTokenBalance((currentBalance) => currentBalance + 5);
    setTokenEvents((currentEvents) => [
      {
        id: Date.now() + Math.random(),
        title: "Daily campus activity bonus",
        amount: 5,
        type: "bonus",
        date: "Just now",
      },
      ...currentEvents,
    ]);

    pushNotification(
      "Daily bonus claimed",
      "You received +5 tokens for staying active in the community.",
      "sparkles"
    );

    Alert.alert("Bonus claimed", "You received 5 tokens for staying active on campus.");
  };

  const toggleFavorite = (itemId: number) => {
    setFavoriteIds((currentIds) => {
      if (currentIds.includes(itemId)) {
        return currentIds.filter((id) => id !== itemId);
      }

      return [...currentIds, itemId];
    });
  };

  const toggleListingPause = (itemId: number) => {
    const item = itemList.find((listing) => listing.id === itemId);

    if (!item || item.owner !== currentUserName) {
      return;
    }

    const nextPausedState = !item.isPaused;

    setItemList((currentItems) =>
      currentItems.map((listing) =>
        listing.id === itemId ? { ...listing, isPaused: nextPausedState } : listing
      )
    );

    pushNotification(
      nextPausedState ? "Listing paused" : "Listing activated",
      nextPausedState
        ? `${item.title} is now hidden from other students.`
        : `${item.title} is visible in the marketplace again.`,
      nextPausedState ? "pause-circle" : "play-circle"
    );

    Alert.alert(
      nextPausedState ? "Listing paused" : "Listing activated",
      nextPausedState
        ? `${item.title} is now hidden from other students.`
        : `${item.title} is visible in the marketplace again.`
    );
  };

  const openConversation = (item: Item) => {
    const existingConversation = conversations.find(
      (conversation) =>
        conversation.itemId === item.id && conversation.owner === item.owner
    );

    if (existingConversation) {
      setSelectedItem(null);
      setBorrowSummaryItem(null);
      setSelectedConversationId(existingConversation.id);
      return;
    }

    const conversationId = Date.now();
    const greeting = getRandomItem(sellerGreetings);

    const newConversation: Conversation = {
      id: conversationId,
      owner: item.owner,
      itemTitle: item.title,
      itemId: item.id,
      messages: [
        {
          id: Date.now() + Math.random(),
          from: "owner",
          text: greeting,
          time: "Now",
        },
      ],
    };

    setConversations((currentConversations) => [
      newConversation,
      ...currentConversations,
    ]);
    setSelectedItem(null);
    setBorrowSummaryItem(null);
    setSelectedConversationId(conversationId);
  };

  const addOwnerMessage = (item: Item, messageText: string) => {
    setConversations((currentConversations) => {
      const existingConversation = currentConversations.find(
        (conversation) =>
          conversation.itemId === item.id && conversation.owner === item.owner
      );

      if (!existingConversation) {
        return currentConversations;
      }

      return currentConversations.map((conversation) => {
        if (conversation.id !== existingConversation.id) {
          return conversation;
        }

        return {
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              id: Date.now() + Math.random(),
              from: "owner",
              text: messageText,
              time: "Now",
            },
          ],
        };
      });
    });
  };

  const sendMessage = (conversationId: number, messageText: string) => {
    const cleanMessage = messageText.trim();

    if (!cleanMessage) {
      return;
    }

    const activeConversation = conversations.find(
      (conversation) => conversation.id === conversationId
    );
    const activeItem = activeConversation
      ? itemList.find((item) => item.id === activeConversation.itemId)
      : undefined;

    const myMessage: ChatMessage = {
      id: Date.now() + Math.random(),
      from: "me",
      text: cleanMessage,
      time: "Now",
    };

    setConversations((currentConversations) =>
      currentConversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        return {
          ...conversation,
          messages: [...conversation.messages, myMessage],
        };
      })
    );

    setTimeout(() => {
      const conversationForReply = activeConversation;
      const ownerReply: ChatMessage = {
        id: Date.now() + Math.random(),
        from: "owner",
        text: conversationForReply
          ? getSmartSellerReply(cleanMessage, conversationForReply, activeItem)
          : getRandomItem(sellerReplies),
        time: "Now",
      };

      setConversations((currentConversations) =>
        currentConversations.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          return {
            ...conversation,
            messages: [...conversation.messages, ownerReply],
          };
        })
      );
    }, 700);
  };

  if (!isStorageReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <Header />
        <View style={styles.loadingState}>
          <Ionicons name="save" size={34} color={colors.blue} />
          <Text style={styles.loadingTitle}>Loading saved demo...</Text>
          <Text style={styles.loadingText}>
            Restoring listings, chats, favorites and token activity.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={completeOnboarding} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <Header />

      <View style={styles.contentShell}>
        {ratingTarget ? (
          <RatingScreen
            request={ratingTarget}
            onSkip={() => setRatingTarget(null)}
            onSubmitReview={submitReview}
          />
        ) : selectedConversation ? (
          <ChatScreen
            conversation={selectedConversation}
            onBack={() => setSelectedConversationId(null)}
            onSendMessage={sendMessage}
          />
        ) : borrowSummaryItem ? (
          <BorrowSummaryScreen
            item={borrowSummaryItem}
            tokenBalance={tokenBalance}
            onBack={() => setBorrowSummaryItem(null)}
            onConfirmBorrow={confirmBorrow}
          />
        ) : selectedItem ? (
          <ItemDetails
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onStartBorrow={startBorrowSummary}
            onOpenConversation={openConversation}
            onToggleListingPause={toggleListingPause}
            ownerRentals={ownerRentals.filter(
              (rental) => rental.itemId === selectedItem.id
            )}
            reviews={reviews.filter((review) => review.itemId === selectedItem.id)}
            isFavorite={favoriteIds.includes(selectedItem.id)}
            onToggleFavorite={() => toggleFavorite(selectedItem.id)}
          />
        ) : (
          <>
            {screen === "home" && (
              <HomeScreen
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                ownerFilter={ownerFilter}
                onChangeOwnerFilter={setOwnerFilter}
                sortOption={sortOption}
                onChangeSortOption={setSortOption}
                selectedPickupFilter={selectedPickupFilter}
                onChangePickupFilter={setSelectedPickupFilter}
                maxTokensFilter={maxTokensFilter}
                onChangeMaxTokensFilter={setMaxTokensFilter}
                depositOnly={depositOnly}
                onToggleDepositOnly={() => setDepositOnly((value) => !value)}
                verifiedOnly={verifiedOnly}
                onToggleVerifiedOnly={() => setVerifiedOnly((value) => !value)}
                availableTodayOnly={availableTodayOnly}
                onToggleAvailableTodayOnly={() => setAvailableTodayOnly((value) => !value)}
                ownerRentals={ownerRentals}
                allItems={itemList}
                items={filteredItems}
                onOpenItem={setSelectedItem}
                query={query}
                onChangeQuery={setQuery}
              />
            )}

            {screen === "add" && <AddItemScreen onPublish={addNewItem} />}

            {screen === "profile" && (
              <ProfileScreen
                tokenBalance={tokenBalance}
                borrowRequests={borrowRequests}
                myListingsCount={
                  itemList.filter((item) => item.owner === currentUserName)
                    .length
                }
                favoriteItems={itemList.filter((item) =>
                  favoriteIds.includes(item.id)
                )}
                conversations={conversations}
                ownerRentals={ownerRentals}
                tokenEvents={tokenEvents}
                notifications={notifications}
                dailyBonusClaimed={dailyBonusClaimed}
                isVerifiedStudent={isVerifiedStudent}
                verifiedEmail={verifiedEmail}
                onOpenFavorite={setSelectedItem}
                onOpenConversation={(conversationId) =>
                  setSelectedConversationId(conversationId)
                }
                onCancelRequest={cancelRequest}
                onMarkReturned={markRequestReturned}
                onMarkOwnerRentalReturned={markOwnerRentalReturned}
                onClaimDailyBonus={claimDailyBonus}
                onResetDemoData={resetDemoData}
              />
            )}
          </>
        )}
      </View>

      {!selectedItem && !selectedConversation && !borrowSummaryItem && !ratingTarget && (
        <BottomNavigation activeScreen={screen} onChangeScreen={setScreen} />
      )}
    </SafeAreaView>
  );
}

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getDueDateLabel(duration: string) {
  switch (duration) {
    case "1 day":
      return "Tomorrow";
    case "3 days":
      return "In 3 days";
    case "1 week":
      return "Next week";
    default:
      return "Soon";
  }
}

function getIconForCategory(category: string): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case "Audiovisual":
      return "camera";
    case "Prototyping":
      return "hardware-chip";
    case "Dress":
      return "shirt";
    case "Study":
      return "laptop";
    default:
      return "cube";
  }
}

function getColorsForCategory(category: string): readonly [string, string] {
  switch (category) {
    case "Audiovisual":
      return ["#2D5BFF", "#66D9FF"];
    case "Prototyping":
      return ["#0F766E", "#B8F2A2"];
    case "Dress":
      return ["#171316", "#FF7048"];
    case "Study":
      return ["#2D5BFF", "#B8F2A2"];
    default:
      return ["#2D5BFF", "#FF7048"];
  }
}

function getSmartSellerReply(
  messageText: string,
  conversation: Conversation,
  item?: Item
): string {
  const message = messageText.toLowerCase();
  const itemTitle = item?.title ?? conversation.itemTitle;
  const pickupLocation = item?.pickupLocation ?? "the selected campus pickup point";
  const availability = item?.availability ?? "available soon";
  const distance = item?.distance ? ` It is shown as ${item.distance} away in the app.` : "";

  const asksAvailability =
    message.includes("available") ||
    message.includes("still") ||
    message.includes("free") ||
    message.includes("can i borrow") ||
    message.includes("can i rent") ||
    message.includes("is it ready");

  const asksWhere =
    message.includes("where") ||
    message.includes("location") ||
    message.includes("place") ||
    message.includes("meet") ||
    message.includes("pickup point") ||
    message.includes("pick up point") ||
    message.includes("collect it");

  const asksWhen =
    message.includes("when") ||
    message.includes("what time") ||
    message.includes("today") ||
    message.includes("tomorrow") ||
    message.includes("collect") ||
    message.includes("pickup") ||
    message.includes("pick up");

  const asksPrice =
    message.includes("token") ||
    message.includes("cost") ||
    message.includes("price") ||
    message.includes("how much") ||
    message.includes("fee");

  const asksDeposit =
    message.includes("deposit") ||
    message.includes("safe") ||
    message.includes("security") ||
    message.includes("guarantee");

  const asksCondition =
    message.includes("condition") ||
    message.includes("working") ||
    message.includes("damaged") ||
    message.includes("new") ||
    message.includes("state");

  const asksDuration =
    message.includes("how long") ||
    message.includes("duration") ||
    message.includes("return") ||
    message.includes("keep it") ||
    message.includes("week");

  if (asksAvailability) {
    return `Yes, ${itemTitle} is still available. It is marked as "${availability}" in the app, so I can keep it reserved while we confirm the pickup.`;
  }

  if (asksWhere) {
    return `You can collect ${itemTitle} at ${pickupLocation}.${distance}`;
  }

  if (asksWhen) {
    if (availability.toLowerCase().includes("today")) {
      return `You can collect ${itemTitle} today after 4 PM. Pickup at ${pickupLocation} works best for me.`;
    }

    if (availability.toLowerCase().includes("tomorrow")) {
      return `Tomorrow works best for ${itemTitle}. I can meet you at ${pickupLocation} after 10 AM.`;
    }

    return `We can arrange collection for ${itemTitle} this week. ${pickupLocation} is the easiest pickup point for me.`;
  }

  if (asksPrice) {
    const tokens = item?.tokens ?? null;
    return tokens
      ? `${itemTitle} is listed for ${tokens} tokens for the base borrow period. Longer duration options are shown in the borrow summary.`
      : `The token cost is visible in the listing and in the borrow summary before you confirm.`;
  }

  if (asksDeposit) {
    if (!item) {
      return "Deposit protection details are shown in the item details before you confirm the request.";
    }

    return item.deposit
      ? `${itemTitle} uses deposit protection, so the borrow request is safer for both sides.`
      : `${itemTitle} does not require deposit protection, but the request is still linked to verified student profiles.`;
  }

  if (asksCondition) {
    return `${itemTitle} is in ${item?.condition ?? "good"} condition and ready to use. I can also show it during pickup if you want.`;
  }

  if (asksDuration) {
    return `You can usually borrow ${itemTitle} for 1 day, 3 days or 1 week. The exact token cost is calculated in the borrow summary.`;
  }

  if (message.includes("thanks") || message.includes("thank you")) {
    return "No problem! Happy to help.";
  }

  return getRandomItem(sellerReplies);
}

function OnboardingScreen({
  onComplete,
}: {
  onComplete: (email: string) => void;
}) {
  const [email, setEmail] = useState("student@university.pt");
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: "swap-horizontal" as keyof typeof Ionicons.glyphMap,
      title: "Borrow gear from students nearby",
      text: "Find cameras, prototyping kits, interview outfits and study tools around your campus.",
    },
    {
      icon: "diamond" as keyof typeof Ionicons.glyphMap,
      title: "Earn and spend tokens",
      text: "Lend unused items to earn tokens, then use them to borrow what you need.",
    },
    {
      icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
      title: "Built around trust",
      text: "Verified university emails, peer ratings and deposit protection make sharing safer.",
    },
  ];

  const currentSlide = slides[step];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep((currentStep) => currentStep + 1);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      Alert.alert("Invalid email", "Please enter a valid university email.");
      return;
    }

    onComplete(cleanEmail);
  };

  return (
    <View style={styles.onboardingScreen}>
      <LinearGradient
        colors={[colors.blue, colors.orange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.onboardingHero}
      >
        <View style={styles.onboardingLogoPanel}>
          <Image
            source={logoSymbol}
            style={styles.onboardingSymbolImage}
            resizeMode="contain"
          />
          <Image
            source={logoWordmark}
            style={styles.onboardingWordmarkImage}
            resizeMode="contain"
          />
          <Text style={styles.onboardingTagline}>Together is better</Text>
        </View>
      </LinearGradient>

      <View style={styles.onboardingContent}>
        <View style={styles.onboardingIconBox}>
          <Ionicons name={currentSlide.icon} size={34} color={colors.blue} />
        </View>
        <Text style={styles.onboardingTitle}>{currentSlide.title}</Text>
        <Text style={styles.onboardingText}>{currentSlide.text}</Text>

        <View style={styles.onboardingDots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.onboardingDot,
                step === index && styles.onboardingDotActive,
              ]}
            />
          ))}
        </View>

        {step === slides.length - 1 && (
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <Ionicons name="school" size={20} color={colors.blue} />
              <Text style={styles.verificationTitle}>University verification</Text>
            </View>
            <Text style={styles.verificationText}>
              This is a mock verification for the demo. Your email will be stored locally with AsyncStorage.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="student@university.pt"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>
        )}

        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>
            {step === slides.length - 1 ? "Verify and enter app" : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

function Header() {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  return (
    <View style={styles.fixedHeader}>
      <Animated.Image
        source={logoSymbol}
        style={[styles.logoSymbolImage, { transform: [{ rotate }] }]}
        resizeMode="contain"
      />

      <View style={styles.logoTextBlock}>
        <Image
          source={logoWordmark}
          style={styles.logoWordmarkImage}
          resizeMode="contain"
        />
        <Text style={styles.logoSubtext}>Together is better · Campus sharing</Text>
      </View>
    </View>
  );
}

function HomeScreen({
  selectedCategory,
  onSelectCategory,
  ownerFilter,
  onChangeOwnerFilter,
  sortOption,
  onChangeSortOption,
  selectedPickupFilter,
  onChangePickupFilter,
  maxTokensFilter,
  onChangeMaxTokensFilter,
  depositOnly,
  onToggleDepositOnly,
  verifiedOnly,
  onToggleVerifiedOnly,
  availableTodayOnly,
  onToggleAvailableTodayOnly,
  ownerRentals,
  allItems,
  items,
  onOpenItem,
  query,
  onChangeQuery,
}: {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  ownerFilter: OwnerFilter;
  onChangeOwnerFilter: (filter: OwnerFilter) => void;
  sortOption: SortOption;
  onChangeSortOption: (option: SortOption) => void;
  selectedPickupFilter: PickupFilter;
  onChangePickupFilter: (location: PickupFilter) => void;
  maxTokensFilter: number | null;
  onChangeMaxTokensFilter: (value: number | null) => void;
  depositOnly: boolean;
  onToggleDepositOnly: () => void;
  verifiedOnly: boolean;
  onToggleVerifiedOnly: () => void;
  availableTodayOnly: boolean;
  onToggleAvailableTodayOnly: () => void;
  ownerRentals: OwnerRental[];
  allItems: Item[];
  items: Item[];
  onOpenItem: (item: Item) => void;
  query: string;
  onChangeQuery: (value: string) => void;
}) {
  const borrowableLocationItems = allItems.filter(
    (item) => item.owner !== currentUserName && !item.isPaused
  );

  const getLocationCount = (location: string) =>
    borrowableLocationItems.filter((item) => item.pickupLocation === location).length;

  const activeFilterCount =
    (selectedCategory !== "All" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0) +
    (sortOption !== "recommended" ? 1 : 0) +
    (selectedPickupFilter ? 1 : 0) +
    (maxTokensFilter !== null ? 1 : 0) +
    (depositOnly ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (availableTodayOnly ? 1 : 0) +
    (query.trim().length > 0 ? 1 : 0);

  const clearFilters = () => {
    onSelectCategory("All");
    onChangeOwnerFilter("all");
    onChangeSortOption("recommended");
    onChangePickupFilter(null);
    onChangeMaxTokensFilter(null);
    if (depositOnly) onToggleDepositOnly();
    if (verifiedOnly) onToggleVerifiedOnly();
    if (availableTodayOnly) onToggleAvailableTodayOnly();
    onChangeQuery("");
  };
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[colors.blue, colors.orange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Ionicons name="location" size={14} color={colors.blue} />
          <Text style={styles.heroBadgeText}>Launching in Porto & beyond</Text>
        </View>

        <Text style={styles.heroTitle}>
          Borrow what you need.{"\n"}Lend what you own.
        </Text>

        <Text style={styles.heroText}>
          A secure student marketplace for gear, tools and professional kits.
        </Text>

        <View style={styles.heroStats}>
          <Stat value="Uni e-mail" label="Student profiles" />
          <Stat value="Tokens" label="Earn by lending" />
          <Stat value="Pickup" label="Meet on campus" />
        </View>
      </LinearGradient>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.muted} />

        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search gear, tools or attire..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />

        {query.length > 0 && (
          <Pressable onPress={() => onChangeQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.filterPanel}>
        <View style={styles.filterPanelHeader}>
          <View>
            <Text style={styles.filterPanelTitle}>Filters & sorting</Text>
            <Text style={styles.filterPanelSubtitle}>
              {activeFilterCount === 0
                ? "Showing recommended campus items"
                : `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`}
            </Text>
          </View>

          {activeFilterCount > 0 && (
            <Pressable onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Clear</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.filterGroupLabel}>Marketplace scope</Text>
        <View style={styles.ownerFilterRowCompact}>
          <OwnerFilterPill
            label="All"
            active={ownerFilter === "all"}
            onPress={() => onChangeOwnerFilter("all")}
          />
          <OwnerFilterPill
            label="From others"
            active={ownerFilter === "others"}
            onPress={() => onChangeOwnerFilter("others")}
          />
          <OwnerFilterPill
            label="My listings"
            active={ownerFilter === "mine"}
            onPress={() => onChangeOwnerFilter("mine")}
          />
        </View>

        <Text style={styles.filterGroupLabel}>Sort by</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortOptionsCompact}
        >
          {sortOptions.map((option) => (
            <SortPill
              key={option.value}
              option={option}
              active={sortOption === option.value}
              onPress={() => onChangeSortOption(option.value)}
            />
          ))}
        </ScrollView>

        <Text style={styles.filterGroupLabel}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesCompact}
        >
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => onSelectCategory(category)}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.filterGroupLabel}>Smart filters</Text>
        <View style={styles.smartFilterGrid}>
          <SmartFilterChip
            icon="shield-checkmark"
            label="Deposit protected"
            active={depositOnly}
            onPress={onToggleDepositOnly}
          />
          <SmartFilterChip
            icon="school"
            label="Verified owners"
            active={verifiedOnly}
            onPress={onToggleVerifiedOnly}
          />
          <SmartFilterChip
            icon="today"
            label="Available today"
            active={availableTodayOnly}
            onPress={onToggleAvailableTodayOnly}
          />
        </View>

        <Text style={styles.filterGroupLabel}>Max token cost</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tokenFilterList}
        >
          <TokenFilterPill
            label="Any price"
            active={maxTokensFilter === null}
            onPress={() => onChangeMaxTokensFilter(null)}
          />
          {maxTokenOptions.map((maxTokens) => (
            <TokenFilterPill
              key={maxTokens}
              label={`≤ ${maxTokens} tokens`}
              active={maxTokensFilter === maxTokens}
              onPress={() => onChangeMaxTokensFilter(maxTokens)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Campus map</Text>
        <Text style={styles.sectionLink}>Tap location</Text>
      </View>

      <CampusMapMock
        selectedLocation={selectedPickupFilter}
        getLocationCount={getLocationCount}
        onSelectLocation={(location) => onChangePickupFilter(location)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hotspotList}
      >
        <CampusHotspotCard
          location="All locations"
          count={borrowableLocationItems.length}
          active={!selectedPickupFilter}
          onPress={() => onChangePickupFilter(null)}
        />
        {pickupOptions.map((location) => (
          <CampusHotspotCard
            key={location}
            location={location}
            count={getLocationCount(location)}
            active={selectedPickupFilter === location}
            onPress={() => onChangePickupFilter(location)}
          />
        ))}
      </ScrollView>

      {selectedPickupFilter && (
        <View style={styles.activeLocationBanner}>
          <View style={styles.activeLocationIcon}>
            <Ionicons name="map" size={18} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeLocationTitle}>
              Showing items at {selectedPickupFilter}
            </Text>
            <Text style={styles.activeLocationText}>
              This only filters marketplace results. Borrow pickup can still be changed later.
            </Text>
          </View>
          <Pressable onPress={() => onChangePickupFilter(null)}>
            <Ionicons name="close-circle" size={22} color={colors.muted} />
          </Pressable>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available items</Text>
        <Text style={styles.sectionLink}>{items.length} results</Text>
      </View>

      {items.length > 0 ? (
        <View style={styles.itemsGrid}>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              activeOwnerRental={ownerRentals.find(
                (rental) => rental.itemId === item.id && rental.status === "Active"
              )}
              onPress={() => onOpenItem(item)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={34} color={colors.muted} />
          <Text style={styles.emptyTitle}>No items found</Text>
          <Text style={styles.emptyText}>
            Try another search phrase, category or marketplace filter.
          </Text>
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function OwnerFilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.ownerFilterPill, active && styles.ownerFilterPillActive]}
    >
      <Text
        style={[
          styles.ownerFilterText,
          active && styles.ownerFilterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SortPill({
  option,
  active,
  onPress,
}: {
  option: { label: string; value: SortOption; icon: keyof typeof Ionicons.glyphMap };
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sortPill, active && styles.sortPillActive]}
    >
      <Ionicons
        name={option.icon}
        size={15}
        color={active ? colors.white : colors.blue}
      />
      <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>
        {option.label}
      </Text>
    </Pressable>
  );
}

function SmartFilterChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.smartFilterChip, active && styles.smartFilterChipActive]}
    >
      <Ionicons name={icon} size={16} color={active ? colors.white : colors.blue} />
      <Text style={[styles.smartFilterChipText, active && styles.smartFilterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TokenFilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tokenFilterPill, active && styles.tokenFilterPillActive]}
    >
      <Text style={[styles.tokenFilterText, active && styles.tokenFilterTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CampusHotspotCard({
  location,
  count,
  active,
  onPress,
}: {
  location: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const isAll = location === "All locations";

  return (
    <Pressable
      onPress={onPress}
      style={[styles.hotspotCard, active && styles.hotspotCardActive]}
    >
      <View style={[styles.hotspotIcon, active && styles.hotspotIconActive]}>
        <Ionicons
          name={isAll ? "apps" : "location"}
          size={18}
          color={active ? colors.white : colors.blue}
        />
      </View>
      <Text style={[styles.hotspotTitle, active && styles.hotspotTitleActive]}>
        {location}
      </Text>
      <Text style={[styles.hotspotMeta, active && styles.hotspotMetaActive]}>
        {count === 1 ? "1 item nearby" : `${count} items nearby`}
      </Text>
    </Pressable>
  );
}

function CampusMapMock({
  selectedLocation,
  getLocationCount,
  onSelectLocation,
}: {
  selectedLocation: PickupFilter;
  getLocationCount: (location: string) => number;
  onSelectLocation: (location: string) => void;
}) {
  return (
    <View style={styles.mapCard}>
      <View style={styles.mapGridLineVertical} />
      <View style={styles.mapGridLineHorizontal} />
      <View style={[styles.mapRoad, styles.mapRoadPrimary]} />
      <View style={[styles.mapRoad, styles.mapRoadSecondary]} />

      {pickupOptions.map((location, index) => (
        <MapPin
          key={location}
          location={location}
          index={index}
          count={getLocationCount(location)}
          active={selectedLocation === location}
          onPress={() => onSelectLocation(location)}
        />
      ))}

      <View style={styles.mapLegend}>
        <Ionicons name="navigate" size={14} color={colors.blue} />
        <Text style={styles.mapLegendText}>Mock campus map</Text>
      </View>
    </View>
  );
}

function MapPin({
  location,
  index,
  count,
  active,
  onPress,
}: {
  location: string;
  index: number;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const positions = [
    { top: 28, left: 24 },
    { top: 42, right: 26 },
    { bottom: 34, left: 36 },
    { bottom: 30, right: 38 },
  ];

  const position = positions[index % positions.length];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.mapPin, position, active && styles.mapPinActive]}
    >
      <Ionicons
        name="location"
        size={18}
        color={active ? colors.white : colors.orange}
      />
      <Text style={[styles.mapPinCount, active && styles.mapPinCountActive]}>
        {count}
      </Text>
      <Text style={[styles.mapPinLabel, active && styles.mapPinLabelActive]} numberOfLines={1}>
        {location}
      </Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ItemCard({
  item,
  activeOwnerRental,
  onPress,
}: {
  item: Item;
  activeOwnerRental?: OwnerRental;
  onPress: () => void;
}) {
  const isMine = item.owner === currentUserName;
  const isPaused = item.isPaused === true;

  return (
    <Pressable onPress={onPress} style={styles.itemCard}>
      <LinearGradient
        colors={item.imageColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.itemImageCard}
      >
        <View style={styles.itemImageIcon}>
          <Ionicons name={item.icon} size={30} color={colors.white} />
        </View>

        <View style={styles.imageCardBadge}>
          <Text style={styles.imageCardBadgeText}>{isPaused ? "Paused" : item.category}</Text>
        </View>
      </LinearGradient>

      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <View style={styles.tokensBadge}>
            <Ionicons name="diamond" size={13} color={colors.orange} />
            <Text style={styles.tokensText}>{item.tokens}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{item.distance}</Text>
          </View>
        </View>

        <View style={styles.itemTitleRow}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {isMine && (
            <View style={styles.mineBadge}>
              <Text style={styles.mineBadgeText}>Mine</Text>
            </View>
          )}
        </View>

        <Text style={styles.itemCategory}>
          {isPaused
            ? "Paused - hidden from other students"
            : activeOwnerRental
              ? `Borrowed by ${activeOwnerRental.borrower} until ${activeOwnerRental.dueDate}`
              : item.availability}
        </Text>

        <View style={styles.itemMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={14} color={colors.orange} />
            <Text style={styles.metaText}>{item.rating}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="map-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{item.pickupLocation}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="person-circle-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{isMine ? "You" : item.owner}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ItemDetails({
  item,
  onBack,
  onStartBorrow,
  onOpenConversation,
  onToggleListingPause,
  ownerRentals,
  reviews,
  isFavorite,
  onToggleFavorite,
}: {
  item: Item;
  onBack: () => void;
  onStartBorrow: (item: Item) => void;
  onOpenConversation: (item: Item) => void;
  onToggleListingPause: (itemId: number) => void;
  ownerRentals: OwnerRental[];
  reviews: Review[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const isMine = item.owner === currentUserName;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.detailsTop}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.detailsTopText}>Item details</Text>

        <View style={{ flex: 1 }} />

        <Pressable onPress={onToggleFavorite} style={styles.favoriteTopButton}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={isFavorite ? colors.orange : colors.text}
          />
        </Pressable>
      </View>

      <LinearGradient
        colors={item.imageColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.detailsHero}
      >
        <View style={styles.detailsIcon}>
          <Ionicons name={item.icon} size={64} color={colors.white} />
        </View>

        <View style={styles.detailsHeroBadge}>
          <Text style={styles.detailsHeroBadgeText}>
            {item.isPaused ? "Paused listing" : item.availability}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.detailsContent}>
        <View style={styles.detailsTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailsTitle}>{item.title}</Text>
            <Text style={styles.detailsOwner}>
              Listed by {isMine ? "you" : item.owner}
            </Text>
          </View>

          <View style={styles.bigTokenBadge}>
            <Ionicons name="diamond" size={16} color={colors.orange} />
            <Text style={styles.bigTokenText}>{item.tokens}</Text>
          </View>
        </View>

        <Text style={styles.detailsDescription}>{item.description}</Text>

        <View style={styles.locationBox}>
          <View style={styles.locationIcon}>
            <Ionicons name="map" size={22} color={colors.blue} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>Pickup location</Text>
            <Text style={styles.locationText}>
              {item.pickupLocation} · {item.distance} from you
            </Text>
          </View>
        </View>

        <View style={styles.itemInsightGrid}>
          <MiniInsight icon="swap-horizontal" value={`${item.swaps ?? 12}`} label="Swaps" />
          <MiniInsight icon="shield-checkmark" value={item.condition ?? "Good"} label="Condition" />
          <MiniInsight icon="heart" value={isFavorite ? "Saved" : "Save"} label="Favorite" />
        </View>

        <Text style={[styles.sectionTitle, styles.reviewsTitle]}>Community notes</Text>
        <View style={styles.reviewsList}>
          {getReviewsForItem(item, reviews).map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </View>

        <View style={styles.trustGrid}>
          <TrustBadge
            icon="checkmark-circle"
            title="Verified student"
            text={item.verified ? "University e-mail checked" : "Not verified"}
          />
          <TrustBadge
            icon="shield-checkmark"
            title="Deposit protection"
            text={item.deposit ? "Bank-hold guarantee" : "No deposit needed"}
          />
          <TrustBadge
            icon="star"
            title="Peer rating"
            text={`${item.rating}/5.0 community score`}
          />
          <TrustBadge
            icon="location"
            title="Campus distance"
            text={`${item.distance} away from you`}
          />
        </View>

        {isMine ? (
          <>
            <View style={styles.ownerInfoBox}>
              <Ionicons name="sparkles" size={20} color={colors.orange} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerInfoTitle}>This is your listing</Text>
                <Text style={styles.ownerInfoText}>
                  In demo mode, you can see who borrowed your item and when it should be returned.
                </Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.secondaryButton,
                item.isPaused && styles.activateListingButton,
              ]}
              onPress={() => onToggleListingPause(item.id)}
            >
              <Text style={styles.secondaryButtonText}>
                {item.isPaused ? "Activate listing" : "Pause listing"}
              </Text>
            </Pressable>

            <Text style={styles.ownerInfoText}>
              Paused listings stay in My listings, but are hidden from other students.
            </Text>

            <Text style={[styles.sectionTitle, styles.listingActivityTitle]}>
              Listing activity
            </Text>

            {ownerRentals.length > 0 ? (
              <View style={styles.ownerRentalsList}>
                {ownerRentals.map((rental) => (
                  <OwnerRentalCard key={rental.id} rental={rental} compact />
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateSmall}>
                <Ionicons name="people-outline" size={28} color={colors.muted} />
                <Text style={styles.emptyTitle}>No borrowers yet</Text>
                <Text style={styles.emptyText}>
                  When somebody borrows this item, their name and due date will appear here.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Pressable style={styles.primaryButton} onPress={() => onStartBorrow(item)}>
              <Text style={styles.primaryButtonText}>Request to borrow</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => onOpenConversation(item)}
            >
              <Text style={styles.secondaryButtonText}>Message owner</Text>
            </Pressable>

            <Pressable
              style={styles.ghostButton}
              onPress={() =>
                Alert.alert(
                  "Report submitted",
                  "Thanks. In the real app, this would notify campus moderators."
                )
              }
            >
              <Text style={styles.ghostButtonText}>Report listing issue</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function MiniInsight({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.miniInsightCard}>
      <Ionicons name={icon} size={18} color={colors.blue} />
      <Text style={styles.miniInsightValue}>{value}</Text>
      <Text style={styles.miniInsightLabel}>{label}</Text>
    </View>
  );
}

function getReviewsForItem(item: Item, reviews: Review[]) {
  const savedReviews = reviews.map((review) => ({
    id: review.id,
    author: review.author,
    text: review.text,
    rating: review.rating,
  }));

  return [
    ...savedReviews,
    {
      id: 1,
      author: "Verified student",
      text: `${item.title} was easy to pick up and matched the description.`,
      rating: item.rating,
    },
    {
      id: 2,
      author: "Campus community",
      text: `Good communication near ${item.pickupLocation}.`,
      rating: Math.max(4.5, item.rating - 0.1),
    },
  ];
}

function ReviewCard({
  review,
}: {
  review: { id: number; author: string; text: string; rating: number };
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <Text style={styles.reviewAuthor}>{review.author}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color={colors.orange} />
          <Text style={styles.metaText}>{review.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={styles.reviewText}>{review.text}</Text>
    </View>
  );
}

function BorrowSummaryScreen({
  item,
  tokenBalance,
  onBack,
  onConfirmBorrow,
}: {
  item: Item;
  tokenBalance: number;
  onBack: () => void;
  onConfirmBorrow: (
    item: Item,
    duration: string,
    pickupLocation: string,
    totalTokens: number
  ) => void;
}) {
  const [selectedDuration, setSelectedDuration] = useState(durationOptions[0]);
  const [selectedPickup, setSelectedPickup] = useState(item.pickupLocation);

  const totalTokens = item.tokens * selectedDuration.multiplier;
  const canAfford = tokenBalance >= totalTokens;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.detailsTop}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.detailsTopText}>Borrow summary</Text>
      </View>

      <View style={styles.summaryCard}>
        <LinearGradient
          colors={item.imageColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryImage}
        >
          <Ionicons name={item.icon} size={48} color={colors.white} />
        </LinearGradient>

        <Text style={styles.summaryTitle}>{item.title}</Text>
        <Text style={styles.summaryOwner}>Owner: {item.owner}</Text>

        <View style={styles.summaryDivider} />

        <Text style={styles.inputLabel}>Borrow duration</Text>
        <View style={styles.optionGrid}>
          {durationOptions.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => setSelectedDuration(option)}
              style={[
                styles.optionPill,
                selectedDuration.label === option.label && styles.optionPillActive,
              ]}
            >
              <Text
                style={[
                  styles.optionPillText,
                  selectedDuration.label === option.label && styles.optionPillTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.inputLabel}>Pickup point</Text>
        <View style={styles.pickupList}>
          {[item.pickupLocation, ...pickupOptions.filter((location) => location !== item.pickupLocation)]
            .slice(0, 4)
            .map((location) => (
              <Pressable
                key={location}
                onPress={() => setSelectedPickup(location)}
                style={[
                  styles.pickupOption,
                  selectedPickup === location && styles.pickupOptionActive,
                ]}
              >
                <Ionicons
                  name={selectedPickup === location ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={selectedPickup === location ? colors.blue : colors.muted}
                />
                <Text style={styles.pickupOptionText}>{location}</Text>
              </Pressable>
            ))}
        </View>

        <View style={styles.costBox}>
          <View>
            <Text style={styles.costLabel}>Total token cost</Text>
            <Text style={styles.costHint}>
              Your balance after request: {tokenBalance - totalTokens}
            </Text>
          </View>

          <View style={styles.costBadge}>
            <Ionicons name="diamond" size={18} color={colors.orange} />
            <Text style={styles.costValue}>{totalTokens}</Text>
          </View>
        </View>

        {!canAfford && (
          <Text style={styles.notEnoughText}>
            You do not have enough tokens for this duration.
          </Text>
        )}

        <Pressable
          style={[styles.primaryButton, !canAfford && styles.disabledButton]}
          disabled={!canAfford}
          onPress={() =>
            onConfirmBorrow(item, selectedDuration.label, selectedPickup, totalTokens)
          }
        >
          <Text style={styles.primaryButtonText}>Confirm request</Text>
          <Ionicons name="checkmark-circle" size={18} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function RatingScreen({
  request,
  onSkip,
  onSubmitReview,
}: {
  request: BorrowRequest;
  onSkip: () => void;
  onSubmitReview: (request: BorrowRequest, rating: number, text: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("Smooth pickup and good communication.");

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.detailsTop}>
        <Pressable onPress={onSkip} style={styles.backButton}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.detailsTopText}>Rate your swap</Text>
      </View>

      <View style={styles.ratingCard}>
        <View style={styles.ratingIconBox}>
          <Ionicons name="star" size={38} color={colors.orange} />
        </View>

        <Text style={styles.ratingTitle}>{request.itemTitle}</Text>
        <Text style={styles.ratingSubtitle}>
          Your item is marked as returned. Add a quick rating to help the campus community.
        </Text>

        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={34}
                color={colors.orange}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.inputLabel}>Short review</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="How was the pickup and item condition?"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, styles.textArea]}
        />

        <Pressable
          style={styles.primaryButton}
          onPress={() => onSubmitReview(request, rating, text)}
        >
          <Text style={styles.primaryButtonText}>Submit review and earn +1</Text>
          <Ionicons name="diamond" size={18} color={colors.white} />
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={onSkip}>
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </Pressable>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function TrustBadge({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.trustBadge}>
      <Ionicons name={icon} size={20} color={colors.blue} />
      <Text style={styles.trustTitle}>{title}</Text>
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

function ChatScreen({
  conversation,
  onBack,
  onSendMessage,
}: {
  conversation: Conversation;
  onBack: () => void;
  onSendMessage: (conversationId: number, message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = () => {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    onSendMessage(conversation.id, cleanMessage);
    setMessage("");
  };

  const handleQuickQuestion = (question: string) => {
    onSendMessage(conversation.id, question);
  };

  return (
    <KeyboardAvoidingView
      style={styles.chatKeyboardAvoiding}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={styles.chatScreen}>
        <View style={styles.chatTop}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.chatOwner}>{conversation.owner}</Text>
            <Text style={styles.chatItem}>About: {conversation.itemTitle}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.chatMessages}
          contentContainerStyle={styles.chatMessagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {conversation.messages.map((chatMessage) => (
            <View
              key={chatMessage.id}
              style={[
                styles.messageBubble,
                chatMessage.from === "me"
                  ? styles.myMessageBubble
                  : styles.ownerMessageBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  chatMessage.from === "me"
                    ? styles.myMessageText
                    : styles.ownerMessageText,
                ]}
              >
                {chatMessage.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  chatMessage.from === "me"
                    ? styles.myMessageTime
                    : styles.ownerMessageTime,
                ]}
              >
                {chatMessage.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {keyboardHeight === 0 && (
          <View style={styles.quickQuestionsBox}>
            <Text style={styles.quickQuestionsTitle}>Quick questions</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickQuestionsRow}
              keyboardShouldPersistTaps="handled"
            >
              {chatQuickQuestions.map((question) => (
                <Pressable
                  key={question}
                  style={styles.quickQuestionPill}
                  onPress={() => handleQuickQuestion(question)}
                >
                  <Text style={styles.quickQuestionText}>{question}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.chatInputBar,
            Platform.OS === "android" && keyboardHeight > 0
              ? { marginBottom: keyboardHeight + 10 }
              : null,
          ]}
        >
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Write a message..."
            placeholderTextColor={colors.muted}
            style={styles.chatInput}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />

          <Pressable style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function AddItemScreen({
  onPublish,
}: {
  onPublish: (item: NewItemInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Audiovisual");
  const [tokens, setTokens] = useState("");
  const [description, setDescription] = useState("");
  const [pickupLocation, setPickupLocation] = useState(pickupOptions[0]);
  const [availability, setAvailability] = useState(availabilityOptions[0]);
  const [deposit, setDeposit] = useState(true);

  const parsedPreviewTokens = Number(tokens);
  const previewTokens = Number.isFinite(parsedPreviewTokens) && parsedPreviewTokens > 0 ? Math.round(parsedPreviewTokens) : 0;

  const handlePublish = () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const parsedTokens = Number(tokens);

    if (!cleanTitle) {
      Alert.alert("Missing item name", "Please enter the item name.");
      return;
    }

    if (!Number.isFinite(parsedTokens) || parsedTokens <= 0) {
      Alert.alert("Invalid tokens", "Please enter a valid token price.");
      return;
    }

    onPublish({
      title: cleanTitle,
      category,
      tokens: Math.round(parsedTokens),
      description: cleanDescription,
      pickupLocation,
      availability,
      deposit,
    });

    setTitle("");
    setCategory("Audiovisual");
    setTokens("");
    setDescription("");
    setPickupLocation(pickupOptions[0]);
    setAvailability(availabilityOptions[0]);
    setDeposit(true);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>List your item</Text>
      <Text style={styles.pageSubtitle}>
        Create a realistic listing with pickup point, availability and deposit settings.
      </Text>

      <View style={styles.addPreviewSection}>
        <Text style={styles.filterGroupLabel}>Live preview</Text>
        <View style={styles.previewListingCard}>
          <LinearGradient
            colors={getColorsForCategory(category)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewImage}
          >
            <Ionicons name={getIconForCategory(category)} size={34} color={colors.white} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewTitle}>{title.trim() || "Your item name"}</Text>
            <Text style={styles.previewMeta}>{category} · {pickupLocation}</Text>
            <Text style={styles.previewMeta}>{availability} · {deposit ? "Deposit protected" : "No deposit"}</Text>
          </View>
          <View style={styles.tokensBadge}>
            <Ionicons name="diamond" size={13} color={colors.orange} />
            <Text style={styles.tokensText}>{previewTokens || "?"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>Item name</Text>
        <TextInput
          placeholder="e.g. DSLR Camera"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <Text style={styles.inputLabel}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.formCategoryList}
        >
          {addCategories.map((option) => (
            <Pressable
              key={option}
              onPress={() => setCategory(option)}
              style={[
                styles.formCategoryPill,
                category === option && styles.formCategoryPillActive,
              ]}
            >
              <Text
                style={[
                  styles.formCategoryText,
                  category === option && styles.formCategoryTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>Pickup location</Text>
        <View style={styles.pickupList}>
          {pickupOptions.map((location) => (
            <Pressable
              key={location}
              onPress={() => setPickupLocation(location)}
              style={[
                styles.pickupOption,
                pickupLocation === location && styles.pickupOptionActive,
              ]}
            >
              <Ionicons
                name={pickupLocation === location ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={pickupLocation === location ? colors.blue : colors.muted}
              />
              <Text style={styles.pickupOptionText}>{location}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.inputLabel}>Availability</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formCategoryList}>
          {availabilityOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => setAvailability(option)}
              style={[
                styles.formCategoryPill,
                availability === option && styles.formCategoryPillActive,
              ]}
            >
              <Text
                style={[
                  styles.formCategoryText,
                  availability === option && styles.formCategoryTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.depositToggle, deposit && styles.depositToggleActive]}
          onPress={() => setDeposit((value) => !value)}
        >
          <View style={styles.depositToggleIcon}>
            <Ionicons name={deposit ? "shield-checkmark" : "shield-outline"} size={20} color={deposit ? colors.blue : colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.depositToggleTitle}>Deposit protection</Text>
            <Text style={styles.depositToggleText}>
              {deposit ? "Bank-hold guarantee shown on listing." : "No deposit required for this item."}
            </Text>
          </View>
          <Ionicons name={deposit ? "toggle" : "toggle-outline"} size={28} color={deposit ? colors.blue : colors.muted} />
        </Pressable>

        <Text style={styles.inputLabel}>Tokens per day</Text>
        <TextInput
          placeholder="e.g. 10"
          placeholderTextColor={colors.muted}
          value={tokens}
          onChangeText={setTokens}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          placeholder="Short description of your item..."
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textArea]}
        />

        <Pressable style={styles.primaryButton} onPress={handlePublish}>
          <Text style={styles.primaryButtonText}>Publish item</Text>
          <Ionicons name="add-circle" size={18} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

type ProfileTab =
  | "overview"
  | "borrowing"
  | "listings"
  | "chats"
  | "saved"
  | "wallet"
  | "alerts";

function ProfileScreen({
  tokenBalance,
  borrowRequests,
  myListingsCount,
  favoriteItems,
  conversations,
  ownerRentals,
  tokenEvents,
  notifications,
  dailyBonusClaimed,
  isVerifiedStudent,
  verifiedEmail,
  onOpenFavorite,
  onOpenConversation,
  onCancelRequest,
  onMarkReturned,
  onMarkOwnerRentalReturned,
  onClaimDailyBonus,
  onResetDemoData,
}: {
  tokenBalance: number;
  borrowRequests: BorrowRequest[];
  myListingsCount: number;
  favoriteItems: Item[];
  conversations: Conversation[];
  ownerRentals: OwnerRental[];
  tokenEvents: TokenEvent[];
  notifications: NotificationItem[];
  dailyBonusClaimed: boolean;
  isVerifiedStudent: boolean;
  verifiedEmail: string;
  onOpenFavorite: (item: Item) => void;
  onOpenConversation: (conversationId: number) => void;
  onCancelRequest: (requestId: number) => void;
  onMarkReturned: (requestId: number) => void;
  onMarkOwnerRentalReturned: (rentalId: number) => void;
  onClaimDailyBonus: () => void;
  onResetDemoData: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  const activeBorrowRequests = borrowRequests.filter(
    (request) => request.status !== "Returned"
  );
  const activeOwnerRentals = ownerRentals.filter(
    (rental) => rental.status !== "Returned"
  );
  const completedSwaps =
    borrowRequests.filter((request) => request.status === "Returned").length +
    ownerRentals.filter((rental) => rental.status === "Returned").length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCardCompact}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>MS</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.profileNameCompact}>{currentUserName}</Text>
          <Text style={styles.profileEmailCompact}>student@university.pt</Text>

          <View style={styles.verifiedBadgeCompact}>
            <Ionicons name="checkmark-circle" size={14} color={colors.blue} />
            <Text style={styles.verifiedText}>Verified student</Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.profileTabsContent}
        style={styles.profileTabs}
      >
        <ProfileTabButton
          icon="grid"
          label="Stats"
          active={activeTab === "overview"}
          onPress={() => setActiveTab("overview")}
        />
        <ProfileTabButton
          icon="document-text"
          label="Borrowing"
          count={activeBorrowRequests.length}
          active={activeTab === "borrowing"}
          onPress={() => setActiveTab("borrowing")}
        />
        <ProfileTabButton
          icon="storefront"
          label="My listings"
          count={activeOwnerRentals.length}
          active={activeTab === "listings"}
          onPress={() => setActiveTab("listings")}
        />
        <ProfileTabButton
          icon="chatbubbles"
          label="Chats"
          count={conversations.length}
          active={activeTab === "chats"}
          onPress={() => setActiveTab("chats")}
        />
        <ProfileTabButton
          icon="heart"
          label="Saved"
          count={favoriteItems.length}
          active={activeTab === "saved"}
          onPress={() => setActiveTab("saved")}
        />
        <ProfileTabButton
          icon="diamond"
          label="Wallet"
          active={activeTab === "wallet"}
          onPress={() => setActiveTab("wallet")}
        />
        <ProfileTabButton
          icon="notifications"
          label="Alerts"
          count={notifications.length}
          active={activeTab === "alerts"}
          onPress={() => setActiveTab("alerts")}
        />
      </ScrollView>

      {activeTab === "overview" && (
        <View>
          <View style={styles.walletCard}>
            <View>
              <Text style={styles.walletLabel}>Token balance</Text>
              <Text style={styles.walletValue}>{tokenBalance}</Text>
            </View>

            <View style={styles.walletIcon}>
              <Ionicons name="diamond" size={30} color={colors.orange} />
            </View>
          </View>

          <Pressable
            style={[
              styles.bonusButton,
              dailyBonusClaimed && styles.bonusButtonDisabled,
            ]}
            onPress={onClaimDailyBonus}
          >
            <View>
              <Text style={styles.bonusButtonTitle}>
                {dailyBonusClaimed
                  ? "Campus bonus claimed"
                  : "Claim daily campus bonus"}
              </Text>
              <Text style={styles.bonusButtonText}>
                {dailyBonusClaimed
                  ? "Come back tomorrow for more tokens."
                  : "Get +5 tokens for staying active in the community."}
              </Text>
            </View>

            <Ionicons
              name={dailyBonusClaimed ? "checkmark-circle" : "sparkles"}
              size={24}
              color={dailyBonusClaimed ? colors.muted : colors.orange}
            />
          </Pressable>

          <Text style={styles.sectionTitle}>Campus impact</Text>

          <View style={styles.impactGrid}>
            <ImpactCard
              icon="swap-horizontal"
              value={`${borrowRequests.length}`}
              label="Borrowed"
            />
            <ImpactCard
              icon="storefront"
              value={`${myListingsCount}`}
              label="Listed"
            />
            <ImpactCard
              icon="checkmark-done"
              value={`${completedSwaps}`}
              label="Returned"
            />
          </View>

          <Text style={[styles.sectionTitle, styles.requestsTitle]}>
            Quick overview
          </Text>

          <View style={styles.profileList}>
            <ProfileRow
              icon="document-text"
              title="Active borrow requests"
              value={`${activeBorrowRequests.length} active`}
            />
            <ProfileRow
              icon="storefront"
              title="Items currently borrowed from you"
              value={`${activeOwnerRentals.length} active`}
            />
            <ProfileRow
              icon="chatbubbles"
              title="Conversations"
              value={`${conversations.length} open chats`}
            />
            <ProfileRow
              icon="heart"
              title="Saved items"
              value={`${favoriteItems.length} favorite items`}
            />
          </View>

          <Text style={[styles.sectionTitle, styles.requestsTitle]}>
            Local storage
          </Text>

          <View style={styles.storageCard}>
            <View style={styles.storageIcon}>
              <Ionicons name="save" size={22} color={colors.blue} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.storageTitle}>Demo data is saved locally</Text>
              <Text style={styles.storageText}>
                Favorites, listings, chats, requests, notifications and tokens stay after app reload.
              </Text>
            </View>
          </View>

          <Pressable style={styles.resetButton} onPress={onResetDemoData}>
            <Ionicons name="refresh" size={18} color={colors.orange} />
            <Text style={styles.resetButtonText}>Reset demo data</Text>
          </Pressable>

          <Text style={[styles.sectionTitle, styles.requestsTitle]}>
            Trust & safety
          </Text>

          <View style={styles.profileList}>
            <ProfileRow
              icon="mail"
              title="University email"
              value={isVerifiedStudent ? verifiedEmail : "Not verified"}
            />
            <ProfileRow
              icon="shield-checkmark"
              title="Deposit system"
              value="Active"
            />
            <ProfileRow icon="star" title="Peer rating" value="4.9/5.0" />
            <ProfileRow
              icon="leaf"
              title="Circular economy"
              value={`${myListingsCount} items shared`}
            />
          </View>
        </View>
      )}

      {activeTab === "borrowing" && (
        <View>
          <Text style={styles.tabPageTitle}>Borrow requests</Text>
          <Text style={styles.tabPageSubtitle}>
            Track what you requested, cancel pending reservations or mark accepted
            items as returned.
          </Text>

          {borrowRequests.length > 0 ? (
            <View style={styles.requestsList}>
              {borrowRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onCancel={() => onCancelRequest(request.id)}
                  onMarkReturned={() => onMarkReturned(request.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={34}
                color={colors.muted}
              />
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyText}>
                Borrow an item from the marketplace to see your request here.
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === "listings" && (
        <View>
          <Text style={styles.tabPageTitle}>My listings activity</Text>
          <Text style={styles.tabPageSubtitle}>
            See who borrowed your items, due dates, pickup points and tokens earned.
          </Text>

          {ownerRentals.length > 0 ? (
            <View style={styles.ownerRentalsList}>
              {ownerRentals.map((rental) => (
                <OwnerRentalCard
                  key={rental.id}
                  rental={rental}
                  onMarkReturned={() => onMarkOwnerRentalReturned(rental.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={34} color={colors.muted} />
              <Text style={styles.emptyTitle}>No active borrowers yet</Text>
              <Text style={styles.emptyText}>
                Publish an item and demo mode will simulate a student borrowing it.
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === "chats" && (
        <View>
          <Text style={styles.tabPageTitle}>Conversations</Text>
          <Text style={styles.tabPageSubtitle}>
            Continue chats with item owners about pickup details and availability.
          </Text>

          {conversations.length > 0 ? (
            <View style={styles.conversationList}>
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  onPress={() => onOpenConversation(conversation.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={34} color={colors.muted} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Message an owner from item details to start a chat.
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === "saved" && (
        <View>
          <Text style={styles.tabPageTitle}>Favorite items</Text>
          <Text style={styles.tabPageSubtitle}>
            Your saved gear, tools and campus resources in one place.
          </Text>

          {favoriteItems.length > 0 ? (
            <View style={styles.favoritesList}>
              {favoriteItems.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  onPress={() => onOpenFavorite(item)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={34} color={colors.muted} />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyText}>
                Tap the heart icon on an item to save it here.
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === "wallet" && (
        <View>
          <View style={styles.walletCard}>
            <View>
              <Text style={styles.walletLabel}>Token balance</Text>
              <Text style={styles.walletValue}>{tokenBalance}</Text>
            </View>

            <View style={styles.walletIcon}>
              <Ionicons name="diamond" size={30} color={colors.orange} />
            </View>
          </View>

          <Pressable
            style={[
              styles.bonusButton,
              dailyBonusClaimed && styles.bonusButtonDisabled,
            ]}
            onPress={onClaimDailyBonus}
          >
            <View>
              <Text style={styles.bonusButtonTitle}>
                {dailyBonusClaimed
                  ? "Campus bonus claimed"
                  : "Claim daily campus bonus"}
              </Text>
              <Text style={styles.bonusButtonText}>
                {dailyBonusClaimed
                  ? "Come back tomorrow for more tokens."
                  : "Get +5 tokens for staying active in the community."}
              </Text>
            </View>

            <Ionicons
              name={dailyBonusClaimed ? "checkmark-circle" : "sparkles"}
              size={24}
              color={dailyBonusClaimed ? colors.muted : colors.orange}
            />
          </Pressable>

          <Text style={styles.tabPageTitle}>Token activity</Text>
          <Text style={styles.tabPageSubtitle}>
            Track reserved, earned, refunded and bonus tokens.
          </Text>

          <View style={styles.tokenEventsList}>
            {tokenEvents.map((event) => (
              <TokenEventCard key={event.id} event={event} />
            ))}
          </View>
        </View>
      )}

      {activeTab === "alerts" && (
        <View>
          <Text style={styles.tabPageTitle}>Notifications</Text>
          <Text style={styles.tabPageSubtitle}>
            Recent activity from requests, chats, listings and token events.
          </Text>

          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function ProfileTabButton({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.profileTabButton, active && styles.profileTabButtonActive]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? colors.white : colors.blue}
      />
      <Text style={[styles.profileTabText, active && styles.profileTabTextActive]}>
        {label}
      </Text>

      {typeof count === "number" && count > 0 && (
        <View style={[styles.profileTabCount, active && styles.profileTabCountActive]}>
          <Text
            style={[
              styles.profileTabCountText,
              active && styles.profileTabCountTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function OwnerRentalCard({
  rental,
  compact = false,
  onMarkReturned,
}: {
  rental: OwnerRental;
  compact?: boolean;
  onMarkReturned?: () => void;
}) {
  const isReturned = rental.status === "Returned";

  return (
    <View style={[styles.ownerRentalCard, compact && styles.ownerRentalCardCompact]}>
      <View style={styles.ownerRentalHeader}>
        <View style={styles.ownerRentalAvatar}>
          <Text style={styles.ownerRentalAvatarText}>
            {rental.borrower.slice(0, 1).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.ownerRentalTitle}>{rental.itemTitle}</Text>
          <Text style={styles.ownerRentalBorrower}>
            Borrowed by {rental.borrower} · {rental.borrowerEmail}
          </Text>
        </View>

        <View
          style={[
            styles.requestStatus,
            isReturned && styles.requestStatusReturned,
          ]}
        >
          <Text
            style={[
              styles.requestStatusText,
              isReturned && styles.requestStatusTextReturned,
            ]}
          >
            {rental.status}
          </Text>
        </View>
      </View>

      <View style={styles.requestMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>Until: {rental.dueDate}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{rental.duration}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="map-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{rental.pickupLocation}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="diamond" size={14} color={colors.orange} />
          <Text style={styles.metaText}>+{rental.tokensEarned} earned</Text>
        </View>
      </View>

      {!compact && !isReturned && onMarkReturned && (
        <Pressable style={styles.requestActionButton} onPress={onMarkReturned}>
          <Text style={styles.requestActionText}>Mark borrower returned item</Text>
        </Pressable>
      )}
    </View>
  );
}

function ImpactCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.impactCard}>
      <Ionicons name={icon} size={20} color={colors.blue} />
      <Text style={styles.impactValue}>{value}</Text>
      <Text style={styles.impactLabel}>{label}</Text>
    </View>
  );
}

function NotificationCard({
  notification,
}: {
  notification: NotificationItem;
}) {
  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationIcon}>
        <Ionicons name={notification.icon} size={18} color={colors.blue} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationText}>{notification.text}</Text>
        <Text style={styles.notificationDate}>{notification.date}</Text>
      </View>
    </View>
  );
}

function ConversationCard({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];

  return (
    <Pressable style={styles.conversationCard} onPress={onPress}>
      <View style={styles.conversationAvatar}>
        <Text style={styles.conversationAvatarText}>
          {conversation.owner.slice(0, 1).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.conversationOwner}>{conversation.owner}</Text>
        <Text style={styles.conversationItem}>{conversation.itemTitle}</Text>
        <Text style={styles.conversationPreview} numberOfLines={1}>
          {lastMessage?.text ?? "No messages yet"}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

function FavoriteCard({
  item,
  onPress,
}: {
  item: Item;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.favoriteCard} onPress={onPress}>
      <LinearGradient colors={item.imageColors} style={styles.favoriteIcon}>
        <Ionicons name={item.icon} size={22} color={colors.white} />
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <Text style={styles.favoriteTitle}>{item.title}</Text>
        <Text style={styles.favoriteMeta}>
          {item.category} · {item.tokens} tokens · {item.pickupLocation}
        </Text>
      </View>

      <Ionicons name="heart" size={20} color={colors.orange} />
    </Pressable>
  );
}

function RequestCard({
  request,
  onCancel,
  onMarkReturned,
}: {
  request: BorrowRequest;
  onCancel: () => void;
  onMarkReturned: () => void;
}) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.requestItemTitle}>{request.itemTitle}</Text>
          <Text style={styles.requestOwner}>Owner: {request.owner}</Text>
        </View>

        <View
          style={[
            styles.requestStatus,
            request.status === "Accepted" && styles.requestStatusAccepted,
            request.status === "Returned" && styles.requestStatusReturned,
          ]}
        >
          <Text
            style={[
              styles.requestStatusText,
              request.status === "Accepted" && styles.requestStatusTextAccepted,
              request.status === "Returned" && styles.requestStatusTextReturned,
            ]}
          >
            {request.status}
          </Text>
        </View>
      </View>

      <View style={styles.requestMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="diamond" size={14} color={colors.orange} />
          <Text style={styles.metaText}>{request.tokens} tokens reserved</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{request.duration}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="map-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{request.pickupLocation}</Text>
        </View>
      </View>

      {request.status === "Pending" && (
        <Pressable style={styles.requestActionButton} onPress={onCancel}>
          <Text style={styles.requestActionText}>Cancel and refund</Text>
        </Pressable>
      )}

      {request.status === "Accepted" && (
        <Pressable style={styles.requestActionButton} onPress={onMarkReturned}>
          <Text style={styles.requestActionText}>Mark as returned</Text>
        </Pressable>
      )}
    </View>
  );
}

function TokenEventCard({ event }: { event: TokenEvent }) {
  const isPositive = event.amount > 0;

  return (
    <View style={styles.tokenEventCard}>
      <View
        style={[
          styles.tokenEventIcon,
          isPositive ? styles.tokenEventIconEarned : styles.tokenEventIconReserved,
        ]}
      >
        <Ionicons
          name={isPositive ? "arrow-up" : "arrow-down"}
          size={18}
          color={isPositive ? colors.blue : colors.orange}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.tokenEventTitle}>{event.title}</Text>
        <Text style={styles.tokenEventDate}>{event.date}</Text>
      </View>

      <Text
        style={[
          styles.tokenEventAmount,
          isPositive ? styles.tokenEventAmountEarned : styles.tokenEventAmountReserved,
        ]}
      >
        {isPositive ? "+" : ""}
        {event.amount}
      </Text>
    </View>
  );
}

function ProfileRow({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.profileRow}>
      <View style={styles.profileRowIcon}>
        <Ionicons name={icon} size={20} color={colors.blue} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.profileRowTitle}>{title}</Text>
        <Text style={styles.profileRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function BottomNavigation({
  activeScreen,
  onChangeScreen,
}: {
  activeScreen: Screen;
  onChangeScreen: (screen: Screen) => void;
}) {
  return (
    <View style={styles.bottomNav}>
      <NavItem
        icon="person"
        label="User"
        active={activeScreen === "profile"}
        onPress={() => onChangeScreen("profile")}
      />

      <NavItem
        icon="home"
        label="Home"
        active={activeScreen === "home"}
        onPress={() => onChangeScreen("home")}
      />

      <NavItem
        icon="add-circle"
        label="Add"
        active={activeScreen === "add"}
        onPress={() => onChangeScreen("add")}
      />
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <Ionicons
        name={icon}
        size={22}
        color={active ? colors.blue : colors.muted}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const colors = {
  blue: "#2D5BFF",
  orange: "#FF7048",
  green: "#B8F2A2",
  ivory: "#F7F5EF",
  lightBlue: "#EAF1FF",
  dark: "#171316",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: colors.ivory,
  },
  loadingTitle: {
    marginTop: 14,
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  loadingText: {
    marginTop: 6,
    color: colors.muted,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  fixedHeader: {
    backgroundColor: colors.ivory,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
    zIndex: 10,
  },
  contentShell: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
    paddingHorizontal: 20,
  },
  logoSymbolImage: {
    width: 44,
    height: 44,
  },
  logoTextBlock: {
    justifyContent: "center",
  },
  logoWordmarkImage: {
    width: 168,
    height: 31,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.blue,
  },
  logoAmp: {
    color: colors.orange,
  },
  logoSubtext: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 0,
    fontWeight: "700",
  },
  hero: {
    borderRadius: 28,
    padding: 22,
    marginTop: 14,
    marginBottom: 18,
    overflow: "hidden",
  },
  heroBadge: {
    backgroundColor: colors.white,
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 24,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroText: {
    color: colors.white,
    opacity: 0.92,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: "row",
    marginTop: 22,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    padding: 12,
  },
  statValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.white,
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
  searchBox: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
  },
  sectionLink: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "800",
  },
  filterPanel: {
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  filterPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  filterPanelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  filterPanelSubtitle: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 3,
  },
  clearFiltersButton: {
    backgroundColor: colors.ivory,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearFiltersText: {
    color: colors.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  filterGroupLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ownerFilterRowCompact: {
    flexDirection: "row",
    gap: 8,
  },
  sortOptionsCompact: {
    gap: 8,
    paddingBottom: 2,
  },
  categoriesCompact: {
    gap: 8,
    paddingBottom: 2,
  },
  ownerFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  ownerFilterPill: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ownerFilterPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  ownerFilterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  ownerFilterTextActive: {
    color: colors.white,
  },
  sortOptions: {
    gap: 10,
    paddingBottom: 20,
  },
  sortPill: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  sortPillText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  sortPillTextActive: {
    color: colors.white,
  },
  mapCard: {
    height: 210,
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  mapGridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "rgba(45, 91, 255, 0.08)",
  },
  mapGridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "rgba(45, 91, 255, 0.08)",
  },
  mapRoad: {
    position: "absolute",
    height: 18,
    backgroundColor: colors.ivory,
    borderRadius: 999,
  },
  mapRoadPrimary: {
    left: -20,
    right: -20,
    top: 92,
    transform: [{ rotate: "-12deg" }],
  },
  mapRoadSecondary: {
    width: 250,
    left: 40,
    top: 86,
    transform: [{ rotate: "62deg" }],
  },
  mapLegend: {
    position: "absolute",
    left: 14,
    bottom: 12,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  mapLegendText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
  },
  mapPin: {
    position: "absolute",
    minWidth: 78,
    maxWidth: 112,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mapPinActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  mapPinCount: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: "900",
    marginTop: -2,
  },
  mapPinCountActive: {
    color: colors.white,
  },
  mapPinLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1,
  },
  mapPinLabelActive: {
    color: colors.white,
  },
  activeLocationBanner: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeLocationIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  activeLocationTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 14,
  },
  activeLocationText: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 3,
    lineHeight: 18,
  },
  hotspotList: {
    gap: 10,
    paddingBottom: 20,
  },
  hotspotCard: {
    width: 150,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hotspotCardActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  hotspotIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  hotspotIconActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  hotspotTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 14,
  },
  hotspotTitleActive: {
    color: colors.white,
  },
  hotspotMeta: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 4,
    fontSize: 12,
  },
  hotspotMetaActive: {
    color: "rgba(255,255,255,0.82)",
  },
  categories: {
    gap: 10,
    paddingBottom: 22,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  categoryText: {
    color: colors.text,
    fontWeight: "800",
  },
  categoryTextActive: {
    color: colors.white,
  },
  itemsGrid: {
    gap: 14,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemImageCard: {
    height: 126,
    padding: 16,
    justifyContent: "space-between",
  },
  itemImageIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageCardBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageCardBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  itemContent: {
    padding: 18,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  tokensBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0EA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tokensText: {
    color: colors.orange,
    fontWeight: "900",
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
  },
  mineBadge: {
    backgroundColor: colors.lightBlue,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mineBadgeText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
  },
  itemCategory: {
    color: colors.muted,
    marginTop: 4,
    fontWeight: "600",
  },
  itemMeta: {
    marginTop: 14,
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
  },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  detailsTop: {
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteTopButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsTopText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
  },
  detailsHero: {
    height: 220,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  detailsIcon: {
    width: 130,
    height: 130,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsHeroBadge: {
    position: "absolute",
    bottom: 18,
    left: 18,
    backgroundColor: "rgba(255,255,255,0.26)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  detailsHeroBadgeText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 12,
  },
  detailsContent: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 30,
  },
  detailsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailsTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.text,
  },
  detailsOwner: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 4,
  },
  bigTokenBadge: {
    backgroundColor: "#FFF0EA",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bigTokenText: {
    color: colors.orange,
    fontSize: 18,
    fontWeight: "900",
  },
  detailsDescription: {
    color: colors.muted,
    lineHeight: 22,
    marginTop: 16,
    fontSize: 15,
  },
  locationBox: {
    marginTop: 18,
    backgroundColor: colors.ivory,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  locationText: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 3,
  },
  itemInsightGrid: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  miniInsightCard: {
    flex: 1,
    backgroundColor: colors.ivory,
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniInsightValue: {
    color: colors.text,
    fontWeight: "900",
    marginTop: 6,
    fontSize: 14,
  },
  miniInsightLabel: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 2,
    fontSize: 11,
  },
  reviewsTitle: {
    marginTop: 22,
    marginBottom: 12,
    fontSize: 20,
  },
  reviewsList: {
    gap: 10,
  },
  reviewCard: {
    backgroundColor: colors.ivory,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewAuthor: {
    color: colors.text,
    fontWeight: "900",
  },
  reviewText: {
    color: colors.muted,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 6,
  },
  trustGrid: {
    marginTop: 20,
    gap: 10,
  },
  trustBadge: {
    backgroundColor: colors.ivory,
    borderRadius: 20,
    padding: 15,
  },
  trustTitle: {
    color: colors.text,
    fontWeight: "900",
    marginTop: 8,
    fontSize: 15,
  },
  trustText: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
  },
  ownerInfoBox: {
    marginTop: 20,
    backgroundColor: "#FFF0EA",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },
  ownerInfoTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  ownerInfoText: {
    color: colors.muted,
    marginTop: 4,
    lineHeight: 19,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.orange,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "900",
  },
  ghostButton: {
    marginTop: 10,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
  },
  ghostButtonText: {
    color: colors.muted,
    fontWeight: "900",
  },
  activateListingButton: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.blue,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryImage: {
    height: 140,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  summaryOwner: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 18,
  },
  optionGrid: {
    flexDirection: "row",
    gap: 8,
  },
  optionPill: {
    flex: 1,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  optionPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  optionPillText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  optionPillTextActive: {
    color: colors.white,
  },
  pickupList: {
    gap: 8,
  },
  pickupOption: {
    backgroundColor: colors.ivory,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickupOptionActive: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.blue,
  },
  pickupOptionText: {
    color: colors.text,
    fontWeight: "800",
  },
  costBox: {
    marginTop: 18,
    backgroundColor: colors.dark,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    color: colors.white,
    fontWeight: "900",
  },
  costHint: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "700",
    marginTop: 4,
  },
  costBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  costValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
  },
  notEnoughText: {
    color: colors.orange,
    fontWeight: "800",
    marginTop: 12,
  },
  chatKeyboardAvoiding: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  chatScreen: {
    flex: 1,
    backgroundColor: colors.ivory,
    paddingHorizontal: 20,
  },
  chatTop: {
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  chatOwner: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  chatItem: {
    color: colors.muted,
    fontWeight: "700",
    marginTop: 2,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
  },
  quickQuestionsBox: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickQuestionsTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
    marginBottom: 8,
  },
  quickQuestionsRow: {
    gap: 8,
    paddingRight: 4,
  },
  quickQuestionPill: {
    backgroundColor: colors.lightBlue,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickQuestionText: {
    color: colors.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 20,
    padding: 13,
  },
  myMessageBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.blue,
    borderBottomRightRadius: 6,
  },
  ownerMessageBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontWeight: "700",
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.white,
  },
  ownerMessageText: {
    color: colors.text,
  },
  messageTime: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "800",
  },
  myMessageTime: {
    color: "rgba(255,255,255,0.75)",
  },
  ownerMessageTime: {
    color: colors.muted,
  },
  chatInputBar: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 8,
    marginBottom: Platform.OS === "android" ? 8 : 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatInput: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    paddingHorizontal: 10,
    minHeight: 42,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    marginTop: 14,
    fontSize: 34,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1,
  },
  pageSubtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    color: colors.text,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.ivory,
    borderRadius: 16,
    padding: 14,
    color: colors.text,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  formCategoryList: {
    gap: 10,
    paddingBottom: 4,
  },
  formCategoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formCategoryPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  formCategoryText: {
    color: colors.text,
    fontWeight: "800",
  },
  formCategoryTextActive: {
    color: colors.white,
  },
  profileCard: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 30,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "900",
  },
  profileName: {
    marginTop: 14,
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  profileEmail: {
    color: colors.muted,
    marginTop: 3,
    fontWeight: "700",
  },
  verifiedBadge: {
    marginTop: 14,
    backgroundColor: colors.lightBlue,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedText: {
    color: colors.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  walletCard: {
    marginTop: 18,
    marginBottom: 12,
    backgroundColor: colors.dark,
    borderRadius: 28,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: {
    color: colors.white,
    opacity: 0.75,
    fontWeight: "700",
  },
  walletValue: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 42,
    marginTop: 4,
  },
  walletIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bonusButton: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bonusButtonDisabled: {
    opacity: 0.72,
  },
  bonusButtonTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  bonusButtonText: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 3,
    lineHeight: 18,
  },
  impactGrid: {
    marginTop: 12,
    marginBottom: 24,
    flexDirection: "row",
    gap: 10,
  },
  impactCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  impactValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  impactLabel: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 2,
  },
  notificationsList: {
    gap: 10,
    marginBottom: 24,
  },
  notificationCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: 12,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  notificationText: {
    color: colors.muted,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3,
  },
  notificationDate: {
    color: colors.blue,
    fontWeight: "900",
    fontSize: 11,
    marginTop: 5,
  },
  storageCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storageIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  storageTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  storageText: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 3,
    lineHeight: 18,
  },
  resetButton: {
    marginTop: 10,
    backgroundColor: "#FFF0EA",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resetButtonText: {
    color: colors.orange,
    fontWeight: "900",
  },
  profileList: {
    marginTop: 12,
    gap: 10,
  },
  profileRow: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRowTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  profileRowValue: {
    color: colors.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  requestsTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  listingActivityTitle: {
    fontSize: 18,
    marginTop: 22,
    marginBottom: 12,
  },
  profileCardCompact: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarSmall: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
  },
  profileNameCompact: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  profileEmailCompact: {
    color: colors.muted,
    marginTop: 2,
    fontWeight: "700",
  },
  verifiedBadgeCompact: {
    marginTop: 9,
    backgroundColor: colors.lightBlue,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
  },
  profileTabs: {
    marginTop: 14,
    marginBottom: 16,
  },
  profileTabsContent: {
    gap: 10,
    paddingRight: 6,
  },
  profileTabButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  profileTabButtonActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  profileTabText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  profileTabTextActive: {
    color: colors.white,
  },
  profileTabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    paddingHorizontal: 6,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTabCountActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  profileTabCountText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
  },
  profileTabCountTextActive: {
    color: colors.white,
  },
  tabPageTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  tabPageSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  ownerRentalsList: {
    gap: 10,
  },
  ownerRentalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ownerRentalCardCompact: {
    backgroundColor: colors.ivory,
  },
  ownerRentalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ownerRentalAvatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerRentalAvatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  ownerRentalTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  ownerRentalBorrower: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 3,
    fontSize: 12,
  },
  emptyStateSmall: {
    backgroundColor: colors.ivory,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  conversationList: {
    gap: 10,
  },
  conversationCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationAvatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  conversationOwner: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  conversationItem: {
    color: colors.blue,
    fontWeight: "800",
    fontSize: 12,
    marginTop: 2,
  },
  conversationPreview: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 3,
  },
  favoritesList: {
    gap: 10,
  },
  favoriteCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  favoriteIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  favoriteMeta: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 3,
  },
  requestsList: {
    gap: 10,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  requestItemTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  requestOwner: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 3,
  },
  requestStatus: {
    backgroundColor: colors.lightBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  requestStatusAccepted: {
    backgroundColor: "#ECFDF5",
  },
  requestStatusReturned: {
    backgroundColor: "#F3F4F6",
  },
  requestStatusText: {
    color: colors.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  requestStatusTextAccepted: {
    color: "#059669",
  },
  requestStatusTextReturned: {
    color: colors.muted,
  },
  requestMeta: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
    flexWrap: "wrap",
  },
  requestActionButton: {
    marginTop: 14,
    backgroundColor: colors.ivory,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  requestActionText: {
    color: colors.text,
    fontWeight: "900",
  },
  tokenEventsList: {
    gap: 10,
  },
  tokenEventCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tokenEventIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenEventIconEarned: {
    backgroundColor: colors.lightBlue,
  },
  tokenEventIconReserved: {
    backgroundColor: "#FFF0EA",
  },
  tokenEventTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 14,
  },
  tokenEventDate: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
  },
  tokenEventAmount: {
    fontSize: 18,
    fontWeight: "900",
  },
  tokenEventAmountEarned: {
    color: colors.blue,
  },
  tokenEventAmountReserved: {
    color: colors.orange,
  },
  onboardingScreen: {
    flex: 1,
    backgroundColor: colors.ivory,
    padding: 20,
  },
  onboardingHero: {
    minHeight: 250,
    borderRadius: 34,
    padding: 24,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  onboardingLogoPanel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 28,
    padding: 18,
    alignItems: "center",
    alignSelf: "stretch",
  },
  onboardingSymbolImage: {
    width: 70,
    height: 56,
    marginBottom: 8,
  },
  onboardingWordmarkImage: {
    width: 238,
    height: 42,
  },
  onboardingBrand: {
    color: colors.white,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  onboardingAmp: {
    color: "#FFD166",
  },
  onboardingTagline: {
    color: colors.muted,
    fontWeight: "800",
    marginTop: 6,
    fontStyle: "italic",
  },
  onboardingContent: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onboardingIconBox: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  onboardingTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  onboardingText: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  onboardingDots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  onboardingDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  onboardingDotActive: {
    width: 28,
    backgroundColor: colors.blue,
  },
  verificationCard: {
    marginTop: 20,
    backgroundColor: colors.ivory,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  verificationTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  verificationText: {
    color: colors.muted,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 19,
  },
  smartFilterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  smartFilterChip: {
    backgroundColor: colors.ivory,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smartFilterChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  smartFilterChipText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  smartFilterChipTextActive: {
    color: colors.white,
  },
  tokenFilterList: {
    gap: 8,
    paddingBottom: 4,
  },
  tokenFilterPill: {
    backgroundColor: colors.ivory,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tokenFilterPillActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  tokenFilterText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  tokenFilterTextActive: {
    color: colors.white,
  },
  addPreviewSection: {
    marginBottom: 16,
  },
  previewListingCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewImage: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  previewMeta: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
    fontSize: 12,
  },
  depositToggle: {
    marginTop: 14,
    backgroundColor: colors.ivory,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  depositToggleActive: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.blue,
  },
  depositToggleIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  depositToggleTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  depositToggleText: {
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 18,
  },
  ratingCard: {
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  ratingIconBox: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: "#FFF0EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  ratingTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  ratingSubtitle: {
    color: colors.muted,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
  ratingStars: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 22,
  },
  bottomNav: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navItem: {
    width: 80,
    alignItems: "center",
    gap: 3,
  },
  navLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  navLabelActive: {
    color: colors.blue,
  },
  spacer: {
    height: 100,
  },
});
