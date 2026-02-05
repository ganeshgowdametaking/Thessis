import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/theme';
import { JobCard } from '../components/JobCard';
import { Job } from '../types';

const DEMO_JOBS: Job[] = [
    {
        id: '1',
        title: 'Senior Product Designer',
        company: 'Stripe',
        location: 'San Francisco, CA',
        salary: '$140k - $180k',
        type: 'Full-time',
        workType: 'Hybrid',
        isNew: true,
        logo: 'card',
        logoBg: '#635bff'
    },
    {
        id: '2',
        title: 'Backend Engineer',
        company: 'Uber',
        location: 'Remote',
        salary: '$160k - $220k',
        type: 'Contract',
        workType: 'Remote',
        isUrgent: true,
        logo: 'car',
        logoBg: '#000000'
    },
    {
        id: '3',
        title: 'Marketing Manager',
        company: 'Airbnb',
        location: 'New York, NY',
        salary: '$110k - $150k',
        type: 'Full-time',
        workType: 'On-site',
        logo: 'home',
        logoBg: '#FF5A5F'
    },
    {
        id: '4',
        title: 'Lead UX Researcher',
        company: 'Spotify',
        location: 'Stockholm, SE',
        salary: '$130k - $170k',
        type: 'Full-time',
        workType: 'Hybrid',
        logo: 'musical-notes',
        logoBg: '#1DB954'
    }
];

export const HomeScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Good Morning,</Text>
                        <Text style={styles.userName}>Ganesh gowda</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationBtn}>
                        <Ionicons name="notifications-outline" size={24} color={COLORS.textMain} />
                        <View style={styles.badge} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <TouchableOpacity style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.searchPlaceholder}>Search for roles, companies...</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Ionicons name="options-outline" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
                    {['All Types', 'Full-time', 'Contract', 'Remote', 'Design', 'Engineering'].map((cat, i) => (
                        <TouchableOpacity key={cat} style={[styles.categoryTag, i === 0 && styles.activeCategory]}>
                            <Text style={[styles.categoryText, i === 0 && styles.activeCategoryText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={DEMO_JOBS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <JobCard
                        job={item}
                        onPress={() => navigation.navigate('JobDetails', { job: item })}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.surface,
    },
    header: {
        padding: SPACING.md,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    greeting: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.accent,
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    searchContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        height: 50,
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    searchPlaceholder: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
    filterBtn: {
        width: 50,
        height: 50,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categories: {
        flexDirection: 'row',
    },
    categoryTag: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    activeCategory: {
        backgroundColor: COLORS.primary + '15',
        borderColor: COLORS.primary,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    activeCategoryText: {
        color: COLORS.primary,
    },
    listContent: {
        padding: SPACING.md,
    },
});
