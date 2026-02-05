import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { Job } from '../types';

interface JobCardProps {
    job: Job;
    onPress: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={[styles.logoContainer, { backgroundColor: job.logoBg }]}>
                    <Ionicons name={job.logo as any} size={24} color="#fff" />
                </View>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{job.title}</Text>
                    <Text style={styles.company}>{job.company}</Text>
                </View>
                <TouchableOpacity>
                    <Ionicons name="bookmark-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.details}>
                <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.detailText}>{job.location}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.detailText}>{job.salary}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.tagRow}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{job.type}</Text>
                    </View>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{job.workType}</Text>
                    </View>
                </View>

                {job.isNew && (
                    <View style={[styles.badge, { backgroundColor: COLORS.success + '15' }]}>
                        <Text style={[styles.badgeText, { color: COLORS.success }]}>New</Text>
                    </View>
                )}
                {job.isUrgent && (
                    <View style={[styles.badge, { backgroundColor: COLORS.error + '15' }]}>
                        <Text style={[styles.badgeText, { color: COLORS.error }]}>Urgent</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    logoContainer: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMain,
        marginBottom: 2,
    },
    company: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    details: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    detailText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        paddingTop: SPACING.md,
    },
    tagRow: {
        flexDirection: 'row',
    },
    tag: {
        backgroundColor: COLORS.surfaceDeep,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        marginRight: 8,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
