package com.thepowerhouse.backend.notifications;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Advanced Notification Service - Production-Grade Java
 * Demonstrates: Spring-style DI, Multithreading, Streams API, Java 17+ features
 * 
 * Modern Java Features:
 * - Records (Java 14+)
 * - Sealed classes (Java 17+)
 * - Pattern matching
 * - ExecutorService for concurrent processing
 * - Stream API for functional programming
 */

// Record for immutable notification data (Java 14+ feature)
record NotificationMessage(String recipient,String subject,String body,Priority priority,LocalDateTime timestamp){
// Compact constructor with validation
public NotificationMessage{Objects.requireNonNull(recipient,"Recipient cannot be null");Objects.requireNonNull(body,"Message body cannot be null");if(timestamp==null){timestamp=LocalDateTime.now();}}}

// Enum for priority levels
enum Priority {
    LOW(1), MEDIUM(2), HIGH(3), URGENT(4);

    private final int level;

    Priority(int level) {
        this.level = level;
    }

    public int getLevel() {
        return level;
    }
}

// Sealed interface for notification channels (Java 17+ feature)
sealed

interface NotificationChannel
permits EmailChannel, SmsChannel, PushChannel
{

    CompletableFuture<Boolean> send(NotificationMessage message);

    String getChannelName();
}

// Email channel implementation
final class EmailChannel implements NotificationChannel {
    private static final Logger LOGGER = Logger.getLogger(EmailChannel.class.getName());

    @Override
    public CompletableFuture<Boolean> send(NotificationMessage message) {
        return CompletableFuture.supplyAsync(() -> {
            LOGGER.info(() -> String.format(
                    "Sending EMAIL to %s: %s",
                    message.recipient(),
                    message.subject()));
            // Simulate email sending delay
            simulateNetworkDelay();
            return true;
        });
    }

    @Override
    public String getChannelName() {
        return "EMAIL";
    }

    private void simulateNetworkDelay() {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

// SMS channel implementation
final class SmsChannel implements NotificationChannel {
    private static final Logger LOGGER = Logger.getLogger(SmsChannel.class.getName());

    @Override
    public CompletableFuture<Boolean> send(NotificationMessage message) {
        return CompletableFuture.supplyAsync(() -> {
            LOGGER.info(() -> String.format(
                    "Sending SMS to %s: %s",
                    message.recipient(),
                    message.body()));
            return true;
        });
    }

    @Override
    public String getChannelName() {
        return "SMS";
    }
}

// Push notification channel
final class PushChannel implements NotificationChannel {
    private static final Logger LOGGER = Logger.getLogger(PushChannel.class.getName());

    @Override
    public CompletableFuture<Boolean> send(NotificationMessage message) {
        return CompletableFuture.supplyAsync(() -> {
            LOGGER.info(() -> String.format(
                    "Sending PUSH to %s",
                    message.recipient()));
            return true;
        });
    }

    @Override
    public String getChannelName() {
        return "PUSH";
    }
}

/**
 * Advanced notification service with dependency injection pattern,
 * concurrent processing, and modern Java features.
 */
public class AdvancedNotificationService {
    private static final Logger LOGGER = Logger.getLogger(AdvancedNotificationService.class.getName());

    private final List<NotificationChannel> channels;
    private final ExecutorService executorService;
    private final BlockingQueue<NotificationMessage> messageQueue;
    private final Map<String, Integer> deliveryStats;

    /**
     * Constructor with dependency injection pattern.
     * Demonstrates: DI, Concurrent collections, ExecutorService
     */
    public AdvancedNotificationService(List<NotificationChannel> channels) {
        this.channels = Objects.requireNonNull(channels, "Channels cannot be null");
        this.executorService = Executors.newFixedThreadPool(
                Runtime.getRuntime().availableProcessors());
        this.messageQueue = new LinkedBlockingQueue<>();
        this.deliveryStats = new ConcurrentHashMap<>();

        LOGGER.info(() -> String.format(
                "Initialized AdvancedNotificationService with %d channels",
                channels.size()));
    }

    /**
     * Queue a notification message.
     * Demonstrates: Thread-safe queue operations
     */
    public void queueMessage(NotificationMessage message) {
        try {
            messageQueue.put(message);
            LOGGER.fine(() -> "Message queued: " + message.recipient());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOGGER.log(Level.SEVERE, "Failed to queue message", e);
        }
    }

    /**
     * Process all queued messages concurrently.
     * Demonstrates: Stream API, CompletableFuture, Method references
     */
    public void processQueue() {
        if (messageQueue.isEmpty()) {
            LOGGER.info("No messages to process.");
            return;
        }

        List<NotificationMessage> messages = new ArrayList<>();
        messageQueue.drainTo(messages);

        LOGGER.info(() -> String.format("Processing %d messages...", messages.size()));

        // Group messages by priority using Stream API
        Map<Priority, List<NotificationMessage>> messagesByPriority = messages.stream()
                .collect(Collectors.groupingBy(NotificationMessage::priority));

        // Process urgent messages first
        List<CompletableFuture<Void>> futures = messagesByPriority.entrySet().stream()
                .sorted(Map.Entry.<Priority, List<NotificationMessage>>comparingByKey()
                        .reversed()
                        .thenComparing(e -> e.getKey().getLevel()))
                .flatMap(entry -> entry.getValue().stream())
                .map(this::sendToAllChannels)
                .toList();

        // Wait for all messages to be sent
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .join();

        LOGGER.info("All messages processed.");
        printStats();
    }

    /**
     * Send message to all available channels concurrently.
     * Demonstrates: CompletableFuture composition, Exception handling
     */
    private CompletableFuture<Void> sendToAllChannels(NotificationMessage message) {
        List<CompletableFuture<Boolean>> channelFutures = channels.stream()
                .map(channel -> channel.send(message)
                        .thenApply(success -> {
                            if (success) {
                                updateStats(channel.getChannelName());
                            }
                            return success;
                        })
                        .exceptionally(ex -> {
                            LOGGER.log(Level.WARNING,
                                    "Failed to send via " + channel.getChannelName(), ex);
                            return false;
                        }))
                .toList();

        return CompletableFuture.allOf(
                channelFutures.toArray(new CompletableFuture[0]));
    }

    /**
     * Update delivery statistics atomically.
     * Demonstrates: ConcurrentHashMap atomic operations
     */
    private void updateStats(String channelName) {
        deliveryStats.merge(channelName, 1, Integer::sum);
    }

    /**
     * Print delivery statistics.
     * Demonstrates: Stream API for data processing
     */
    private void printStats() {
        System.out.println("\n=== Delivery Statistics ===");
        deliveryStats.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(entry -> System.out.printf(
                        "%s: %d messages%n",
                        entry.getKey(),
                        entry.getValue()));
    }

    /**
     * Graceful shutdown of the service.
     * Demonstrates: Resource management, ExecutorService shutdown
     */
    public void shutdown() {
        LOGGER.info("Shutting down notification service...");
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Factory method for creating service with default channels.
     * Demonstrates: Factory pattern, Fluent API
     */
    public static AdvancedNotificationService createDefault() {
        return new AdvancedNotificationService(List.of(
                new EmailChannel(),
                new SmsChannel(),
                new PushChannel()));
    }

    /**
     * Main method demonstrating the service usage.
     */
    public static void main(String[] args) {
        System.out.println("=== Advanced Java Notification Service ===\n");

        // Create service using factory method
        AdvancedNotificationService service = AdvancedNotificationService.createDefault();

        try {
            // Create sample notifications with different priorities
            List<NotificationMessage> sampleMessages = List.of(
                    new NotificationMessage(
                            "admin@thepowerhouse.com",
                            "System Alert",
                            "Server load at 85%",
                            Priority.URGENT,
                            LocalDateTime.now()),
                    new NotificationMessage(
                            "user@example.com",
                            "Reminder",
                            "Your choir rehearsal is starting soon",
                            Priority.MEDIUM,
                            LocalDateTime.now()),
                    new NotificationMessage(
                            "member@church.com",
                            "Newsletter",
                            "Monthly newsletter is available",
                            Priority.LOW,
                            LocalDateTime.now()));

            // Queue all messages
            sampleMessages.forEach(service::queueMessage);

            // Process queue with concurrent execution
            service.processQueue();

        } finally {
            // Ensure proper cleanup
            service.shutdown();
        }

        System.out.println("\n✓ Service shutdown complete");
    }
}
