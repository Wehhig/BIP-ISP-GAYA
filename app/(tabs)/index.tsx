import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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
};

type BorrowRequest = {
  id: number;
  itemTitle: string;
  owner: string;
  tokens: number;
  status: "Pending" | "Accepted" | "Returned";
  date: string;
};

type NewItemInput = {
  title: string;
  category: string;
  tokens: number;
  description: string;
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
  type: "earned" | "reserved";
  date: string;
};

const currentUserName = "Mock Student";

const categories = ["All", "Audiovisual", "Prototyping", "Dress", "Study"];
const addCategories = ["Audiovisual", "Prototyping", "Dress", "Study"];

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

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [itemList, setItemList] = useState<Item[]>(initialItems);
  const [tokenBalance, setTokenBalance] = useState(42);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tokenEvents, setTokenEvents] = useState<TokenEvent[]>([
    {
      id: 1001,
      title: "Welcome bonus",
      amount: 42,
      type: "earned",
      date: "Today",
    },
  ]);

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

    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length > 0) {
      result = result.filter((item) => {
        return (
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.category.toLowerCase().includes(normalizedQuery) ||
          item.owner.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery)
        );
      });
    }

    return result;
  }, [itemList, selectedCategory, ownerFilter, query]);

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
      deposit: newItem.category !== "Dress",
      description:
        newItem.description ||
        "New student listing added in demo mode. In the final app, this would be saved in a database.",
      icon: getIconForCategory(newItem.category),
    };

    setItemList((currentItems) => [item, ...currentItems]);
    setSelectedCategory("All");
    setOwnerFilter("mine");
    setQuery("");
    setScreen("home");

    Alert.alert(
      "Item published",
      `${item.title} has been added to your listings. Demo mode will simulate a borrow request in a few seconds.`
    );

    setTimeout(() => {
      setTokenBalance((currentBalance) => currentBalance + item.tokens);
      setTokenEvents((currentEvents) => [
        {
          id: Date.now() + Math.random(),
          title: `${item.title} borrowed by another student`,
          amount: item.tokens,
          type: "earned",
          date: "Just now",
        },
        ...currentEvents,
      ]);

      Alert.alert(
        "Tokens earned",
        `Another student borrowed ${item.title}. You earned ${item.tokens} tokens.`
      );
    }, 4500);
  };

  const handleBorrow = (item: Item) => {
    const alreadyRequested = borrowRequests.some(
      (request) =>
        request.itemTitle === item.title && request.status === "Pending"
    );

    if (alreadyRequested) {
      Alert.alert(
        "Request already sent",
        `You already have a pending request for ${item.title}.`
      );
      return;
    }

    if (item.owner === currentUserName) {
      Alert.alert(
        "This is your listing",
        "You cannot borrow an item that you listed yourself."
      );
      return;
    }

    if (tokenBalance < item.tokens) {
      Alert.alert(
        "Not enough tokens",
        `You need ${item.tokens} tokens, but you only have ${tokenBalance}.`
      );
      return;
    }

    const newRequest: BorrowRequest = {
      id: Date.now(),
      itemTitle: item.title,
      owner: item.owner,
      tokens: item.tokens,
      status: "Pending",
      date: "Today",
    };

    setBorrowRequests((currentRequests) => [newRequest, ...currentRequests]);
    setTokenBalance((currentBalance) => currentBalance - item.tokens);
    setTokenEvents((currentEvents) => [
      {
        id: Date.now() + Math.random(),
        title: `${item.title} request`,
        amount: -item.tokens,
        type: "reserved",
        date: "Today",
      },
      ...currentEvents,
    ]);

    openConversation(item);

    Alert.alert(
      "Borrow request sent",
      `Your request for ${item.title} was sent to ${item.owner}. ${item.tokens} tokens are now reserved.`
    );
  };

  const toggleFavorite = (itemId: number) => {
    setFavoriteIds((currentIds) => {
      if (currentIds.includes(itemId)) {
        return currentIds.filter((id) => id !== itemId);
      }

      return [...currentIds, itemId];
    });
  };

  const openConversation = (item: Item) => {
    const existingConversation = conversations.find(
      (conversation) =>
        conversation.itemId === item.id && conversation.owner === item.owner
    );

    if (existingConversation) {
      setSelectedItem(null);
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
    setSelectedConversationId(conversationId);
  };

  const sendMessage = (conversationId: number, messageText: string) => {
    const cleanMessage = messageText.trim();

    if (!cleanMessage) {
      return;
    }

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
      const ownerReply: ChatMessage = {
        id: Date.now() + Math.random(),
        from: "owner",
        text: getRandomItem(sellerReplies),
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <Header />

      <View style={styles.contentShell}>
        {selectedConversation ? (
          <ChatScreen
            conversation={selectedConversation}
            onBack={() => setSelectedConversationId(null)}
            onSendMessage={sendMessage}
          />
        ) : selectedItem ? (
          <ItemDetails
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onBorrow={handleBorrow}
            onOpenConversation={openConversation}
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
                tokenEvents={tokenEvents}
                onOpenFavorite={setSelectedItem}
                onOpenConversation={(conversationId) =>
                  setSelectedConversationId(conversationId)
                }
              />
            )}
          </>
        )}
      </View>

      {!selectedItem && !selectedConversation && (
        <BottomNavigation activeScreen={screen} onChangeScreen={setScreen} />
      )}
    </SafeAreaView>
  );
}

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
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
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.fixedHeader}>
      <View style={styles.logoMark}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="sync" size={22} color={colors.white} />
        </Animated.View>
      </View>

      <View>
        <Text style={styles.logoText}>
          Stud<Text style={styles.logoAmp}>&</Text>Swap
        </Text>
        <Text style={styles.logoSubtext}>Campus sharing marketplace</Text>
      </View>
    </View>
  );
}

function HomeScreen({
  selectedCategory,
  onSelectCategory,
  ownerFilter,
  onChangeOwnerFilter,
  items,
  onOpenItem,
  query,
  onChangeQuery,
}: {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  ownerFilter: OwnerFilter;
  onChangeOwnerFilter: (filter: OwnerFilter) => void;
  items: Item[];
  onOpenItem: (item: Item) => void;
  query: string;
  onChangeQuery: (value: string) => void;
}) {
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
          <Stat value="100%" label="Verified" />
          <Stat value="24h" label="Fast borrow" />
          <Stat value="+∞" label="Campus items" />
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Marketplace</Text>
        <Text style={styles.sectionLink}>{items.length} items</Text>
      </View>

      <View style={styles.ownerFilterRow}>
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.sectionLink}>Explore</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
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

      {items.length > 0 ? (
        <View style={styles.itemsGrid}>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const isMine = item.owner === currentUserName;

  return (
    <Pressable onPress={onPress} style={styles.itemCard}>
      <View style={styles.itemTop}>
        <View style={styles.itemIcon}>
          <Ionicons name={item.icon} size={24} color={colors.blue} />
        </View>

        <View style={styles.tokensBadge}>
          <Ionicons name="diamond" size={13} color={colors.orange} />
          <Text style={styles.tokensText}>{item.tokens}</Text>
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

      <Text style={styles.itemCategory}>{item.category}</Text>

      <View style={styles.itemMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{item.distance}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="star" size={14} color={colors.orange} />
          <Text style={styles.metaText}>{item.rating}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="person-circle-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{isMine ? "You" : item.owner}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ItemDetails({
  item,
  onBack,
  onBorrow,
  onOpenConversation,
  isFavorite,
  onToggleFavorite,
}: {
  item: Item;
  onBack: () => void;
  onBorrow: (item: Item) => void;
  onOpenConversation: (item: Item) => void;
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
        colors={[colors.ivory, colors.lightBlue]}
        style={styles.detailsHero}
      >
        <View style={styles.detailsIcon}>
          <Ionicons name={item.icon} size={64} color={colors.blue} />
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
          <View style={styles.ownerInfoBox}>
            <Ionicons name="sparkles" size={20} color={colors.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerInfoTitle}>This is your listing</Text>
              <Text style={styles.ownerInfoText}>
                In demo mode, tokens are earned automatically when another student borrows it.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Pressable style={styles.primaryButton} onPress={() => onBorrow(item)}>
              <Text style={styles.primaryButtonText}>Request to borrow</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => onOpenConversation(item)}
            >
              <Text style={styles.secondaryButtonText}>Message owner</Text>
            </Pressable>
          </>
        )}
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

  const handleSend = () => {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    onSendMessage(conversation.id, cleanMessage);
    setMessage("");
  };

  return (
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

      <View style={styles.chatInputBar}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Write a message..."
          placeholderTextColor={colors.muted}
          style={styles.chatInput}
        />

        <Pressable style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
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
    });

    setTitle("");
    setCategory("Audiovisual");
    setTokens("");
    setDescription("");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>List your item</Text>
      <Text style={styles.pageSubtitle}>
        Add gear you do not use every day and earn tokens from your campus
        community.
      </Text>

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

function ProfileScreen({
  tokenBalance,
  borrowRequests,
  myListingsCount,
  favoriteItems,
  conversations,
  tokenEvents,
  onOpenFavorite,
  onOpenConversation,
}: {
  tokenBalance: number;
  borrowRequests: BorrowRequest[];
  myListingsCount: number;
  favoriteItems: Item[];
  conversations: Conversation[];
  tokenEvents: TokenEvent[];
  onOpenFavorite: (item: Item) => void;
  onOpenConversation: (conversationId: number) => void;
}) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>MS</Text>
        </View>

        <Text style={styles.profileName}>{currentUserName}</Text>
        <Text style={styles.profileEmail}>student@university.pt</Text>

        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.blue} />
          <Text style={styles.verifiedText}>Verified university student</Text>
        </View>
      </View>

      <View style={styles.walletCard}>
        <View>
          <Text style={styles.walletLabel}>Token balance</Text>
          <Text style={styles.walletValue}>{tokenBalance}</Text>
        </View>

        <View style={styles.walletIcon}>
          <Ionicons name="diamond" size={30} color={colors.orange} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Trust & safety</Text>

      <View style={styles.profileList}>
        <ProfileRow icon="mail" title="University email" value="Verified" />
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

      <Text style={[styles.sectionTitle, styles.requestsTitle]}>
        Conversations
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

      <Text style={[styles.sectionTitle, styles.requestsTitle]}>
        Favorite items
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

      <Text style={[styles.sectionTitle, styles.requestsTitle]}>
        Borrow requests
      </Text>

      {borrowRequests.length > 0 ? (
        <View style={styles.requestsList}>
          {borrowRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={34} color={colors.muted} />
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptyText}>
            Borrow an item from the marketplace to see your request here.
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, styles.requestsTitle]}>
        Token activity
      </Text>

      <View style={styles.tokenEventsList}>
        {tokenEvents.map((event) => (
          <TokenEventCard key={event.id} event={event} />
        ))}
      </View>

      <View style={styles.spacer} />
    </ScrollView>
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
      <View style={styles.favoriteIcon}>
        <Ionicons name={item.icon} size={22} color={colors.blue} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.favoriteTitle}>{item.title}</Text>
        <Text style={styles.favoriteMeta}>
          {item.category} · {item.tokens} tokens
        </Text>
      </View>

      <Ionicons name="heart" size={20} color={colors.orange} />
    </Pressable>
  );
}

function RequestCard({ request }: { request: BorrowRequest }) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.requestItemTitle}>{request.itemTitle}</Text>
          <Text style={styles.requestOwner}>Owner: {request.owner}</Text>
        </View>

        <View style={styles.requestStatus}>
          <Text style={styles.requestStatusText}>{request.status}</Text>
        </View>
      </View>

      <View style={styles.requestMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="diamond" size={14} color={colors.orange} />
          <Text style={styles.metaText}>{request.tokens} tokens reserved</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{request.date}</Text>
        </View>
      </View>
    </View>
  );
}

function TokenEventCard({ event }: { event: TokenEvent }) {
  const isEarned = event.amount > 0;

  return (
    <View style={styles.tokenEventCard}>
      <View
        style={[
          styles.tokenEventIcon,
          isEarned ? styles.tokenEventIconEarned : styles.tokenEventIconReserved,
        ]}
      >
        <Ionicons
          name={isEarned ? "arrow-up" : "arrow-down"}
          size={18}
          color={isEarned ? colors.blue : colors.orange}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.tokenEventTitle}>{event.title}</Text>
        <Text style={styles.tokenEventDate}>{event.date}</Text>
      </View>

      <Text
        style={[
          styles.tokenEventAmount,
          isEarned ? styles.tokenEventAmountEarned : styles.tokenEventAmountReserved,
        ]}
      >
        {isEarned ? "+" : ""}
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
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 12,
    color: colors.muted,
    marginTop: -2,
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
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  itemIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
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
  },
  detailsIcon: {
    width: 130,
    height: 130,
    borderRadius: 42,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 12,
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
    marginBottom: 24,
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
    backgroundColor: colors.lightBlue,
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
  requestStatusText: {
    color: colors.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  requestMeta: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
    flexWrap: "wrap",
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
