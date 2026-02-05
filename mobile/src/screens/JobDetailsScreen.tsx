import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/theme';
import { RootStackParamList } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetails'>;

export const JobDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { job } = route.params;

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Job Details</Text>
                    <TouchableOpacity style={styles.shareBtn}>
                        <Ionicons name="share-outline" size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.companyInfo}>
                    <View style={[styles.logoContainer, { backgroundColor: job.logoBg }]}>
                        <Ionicons name={job.logo as any} size={48} color="#fff" />
                    </View>
                    <Text style={styles.title}>{job.title}</Text>
                    <Text style={styles.company}>{job.company} • {job.location}</Text>

                    <View style={styles.badgeRow}>
                        <View style={styles.metaBadge}>
                            <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.metaText}>{job.salary}</Text>
                        </View>
                        <View style={styles.metaBadge}>
                            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.metaText}>Posted 2h ago</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About the Role</Text>
                    <Text style={styles.sectionText}>
                        We are looking for a {job.title} to join our team and help shape the future of our platform.
                        You will work closely with product managers and engineers to define the product strategy
                        and create seamless experiences for millions of users worldwide.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Responsibilities</Text>
                    {[
                        'Lead end-to-end projects across the product lifecycle.',
                        'Partner with engineering to ensure high-quality implementation.',
                        'Contribute to our internal design system and culture.',
                        'Mentor junior team members and conduct reviews.'
                    ].map((item, index) => (
                        <View key={index} style={styles.listItem}>
                            <View style={styles.listIcon}>
                                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                            </View>
                            <Text style={styles.listText}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hiring Manager</Text>
                    <View style={styles.managerCard}>
                        <View style={styles.managerAvatar}>
                            <Ionicons name="person" size={32} color={COLORS.white} />
                        </View>
                        <View style={styles.managerDetails}>
                            <Text style={styles.managerName}>Sarah Connor</Text>
                            <Text style={styles.managerTitle}>Lead Recruiter at {job.company}</Text>
                        </View>
                        <TouchableOpacity style={styles.msgBtn}>
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.applyBtn}>
                    <Text style={styles.applyBtnText}>Apply Now</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        height: 56,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    shareBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 100,
    },
    companyInfo: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.textMain,
        textAlign: 'center',
        marginBottom: 4,
    },
    company: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMain,
        marginLeft: 6,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textMain,
        marginBottom: SPACING.md,
    },
    sectionText: {
        fontSize: 15,
        lineHeight: 24,
        color: COLORS.textSecondary,
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    listIcon: {
        marginRight: 10,
        marginTop: 2,
    },
    listText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
        color: COLORS.textSecondary,
    },
    managerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    managerAvatar: {
        width: 50,
        height: 50,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    managerDetails: {
        flex: 1,
        marginLeft: 12,
    },
    managerName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    managerTitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    msgBtn: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    applyBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        height: 56,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    applyBtnText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '700',
    },
});

import { Platform } from 'react-native';
