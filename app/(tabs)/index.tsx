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

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  const [itemList, setItemList] = useState<Item[]>(initialItems);
  const [tokenBalance, setTokenBalance] = useState(42);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const filteredItems = useMemo(() => {
    let result = itemList;

    if (selectedCategory !== "All") {
      result = result.filter((item) => item.category === selectedCategory);
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
  }, [itemList, selectedCategory, query]);

  const addNewItem = (newItem: NewItemInput) => {
    const item: Item = {
      id: Date.now(),
      title: newItem.title,
      category: newItem.category,
      tokens: newItem.tokens,
      distance: "0.3 km",
      rating: 5.0,
      owner: "Mock Student",
      verified: true,
      deposit: newItem.category !== "Dress",
      description:
        newItem.description ||
        "New student listing added in demo mode. In the final app, this would be saved in a database.",
      icon: getIconForCategory(newItem.category),
    };

    setItemList((currentItems) => [item, ...currentItems]);
    setSelectedCategory("All");
    setQuery("");
    setScreen("home");

    Alert.alert(
      "Item published",
      `${item.title} has been added to the marketplace demo.`
    );
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <Header />

      <View style={styles.contentShell}>
        {selectedItem ? (
          <ItemDetails
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onBorrow={handleBorrow}
            isFavorite={favoriteIds.includes(selectedItem.id)}
            onToggleFavorite={() => toggleFavorite(selectedItem.id)}
          />
        ) : (
          <>
            {screen === "home" && (
              <HomeScreen
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
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
                  itemList.filter((item) => item.owner === "Mock Student")
                    .length
                }
              />
            )}
          </>
        )}
      </View>

      {!selectedItem && (
        <BottomNavigation activeScreen={screen} onChangeScreen={setScreen} />
      )}
    </SafeAreaView>
  );
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
  items,
  onOpenItem,
  query,
  onChangeQuery,
}: {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available near you</Text>
        <Text style={styles.sectionLink}>{items.length} items</Text>
      </View>

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
            Try another search phrase or choose a different category.
          </Text>
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
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

      <Text style={styles.itemTitle}>{item.title}</Text>
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
      </View>
    </Pressable>
  );
}

function ItemDetails({
  item,
  onBack,
  onBorrow,
  isFavorite,
  onToggleFavorite,
}: {
  item: Item;
  onBack: () => void;
  onBorrow: (item: Item) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
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
            <Text style={styles.detailsOwner}>Listed by {item.owner}</Text>
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

        <Pressable style={styles.primaryButton} onPress={() => onBorrow(item)}>
          <Text style={styles.primaryButtonText}>Request to borrow</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            Alert.alert(
              "Message owner",
              `Demo chat with ${item.owner} has been opened. In the final app, this would start a real conversation.`
            )
          }
        >
          <Text style={styles.secondaryButtonText}>Message owner</Text>
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
}: {
  tokenBalance: number;
  borrowRequests: BorrowRequest[];
  myListingsCount: number;
}) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>MS</Text>
        </View>

        <Text style={styles.profileName}>Mock Student</Text>
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

      <View style={styles.spacer} />
    </ScrollView>
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
  itemTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
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