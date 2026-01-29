package com.thepowerhouse.backend.notifications;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Advanced Notification Service - Java 8+ Compatible
 * Demonstrates: Concurrency, Streams API, Design Patterns, Best Practices
 */

// Immutable notification message
class NotificationMessage {
    private final String recipient;
    private final String subject;
    private final String body;
    private final Priority priority;
    private final LocalDateTime timestamp;

    public NotificationMessage(String recipient, String subject, String body, Priority priority) {
        this.recipient = Objects.requireNonNull(recipient, "Recipient cannot be null");
        this.subject = subject;
        this.body = Objects.requireNonNull(body, "Message body cannot be null");
        this.priority = priority;
        this.timestamp = LocalDateTime.now();
    }

    public String getRecipient() {
        return recipient;
    }

    public String getSubject() {
        return subject;
    }

    public String getBody() {
        return body;
    }

    public Priority getPriority() {
        return priority;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}

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

interface NotificationChannel {
    CompletableFuture<Boolean> send(NotificationMessage message);

    String getChannelName();
}

class EmailChannel implements NotificationChannel {
    private static final Logger LOGGER = Logger.getLogger(EmailChannel.class.getName());

    @Override
    public CompletableFuture<Boolean> send(NotificationMessage message) {
        return CompletableFuture.supplyAsync(() -> {
            LOGGER.info(String.format(
                    "[EMAIL] To: %s | Subject: %s",
                    message.getRecipient(),
                    message.getSubject()));
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return true;
        });
    }

    @Override
    public String getChannelName() {
        return "EMAIL";
    }
}

class SmsChannel implements NotificationChannel {
    private static final Logger LOGGER = Logger.getLogger(SmsChannel.class.getName());

    @Override
    public CompletableFuture<Boolean> send(NotificationMessage message) {
        return CompletableFuture.supplyAsync(() -> {
            LOGGER.info(String.format("[SMS] To: %s | Message: %s",
                    message.getRecipient(), message.getBody()));
            return true;
        });
    }

    @Override
    public String getChannelName() {
        return "SMS";
    }
}

class PushChannel implements NotificationChannel {
    private static final Logger LOGGER = Logger.getLogger(PushChannel.class.getName());

    @Override
    public CompletableFuture<Boolean> send(NotificationMessage message) {
        return CompletableFuture.supplyAsync(() -> {
            LOGGER.info(String.format("[PUSH] To: %s", message.getRecipient()));
            return true;
        });
    }

    @Override
    public String getChannelName() {
        return "PUSH";
    }
}

public class AdvancedNotificationService {
    private static final Logger LOGGER = Logger.getLogger(AdvancedNotificationService.class.getName());

    private final List<NotificationChannel> channels;
    private final ExecutorService executorService;
    private final BlockingQueue<NotificationMessage> messageQueue;
    private final Map<String, Integer> deliveryStats;

    public AdvancedNotificationService(List<NotificationChannel> channels) {
        this.channels = Objects.requireNonNull(channels, "Channels cannot be null");
        this.executorService = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());
        this.messageQueue = new LinkedBlockingQueue<>();
        this.deliveryStats = new ConcurrentHashMap<>();

        LOGGER.info(String.format("✓ Initialized with %d channels", channels.size()));
    }

    public void queueMessage(NotificationMessage message) {
        try {
            messageQueue.put(message);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOGGER.log(Level.SEVERE, "Failed to queue message", e);
        }
    }

    public void processQueue() {
        if (messageQueue.isEmpty()) {
            LOGGER.info("No messages to process.");
            return;
        }

        List<NotificationMessage> messages = new ArrayList<>();
        messageQueue.drainTo(messages);

        LOGGER.info(String.format("⚡ Processing %d messages...", messages.size()));

        Map<Priority, List<NotificationMessage>> messagesByPriority = messages.stream()
                .collect(Collectors.groupingBy(NotificationMessage::getPriority));

        List<CompletableFuture<Void>> futures = messagesByPriority.entrySet().stream()
                .sorted((e1, e2) -> Integer.compare(e2.getKey().getLevel(), e1.getKey().getLevel()))
                .flatMap(entry -> entry.getValue().stream())
                .map(this::sendToAllChannels)
                .collect(Collectors.toList());

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        LOGGER.info("✓ All messages processed.");
        printStats();
    }

    private CompletableFuture<Void> sendToAllChannels(NotificationMessage message) {
        List<CompletableFuture<Boolean>> channelFutures = channels.stream()
                .map(channel -> channel.send(message)
                        .thenApply(success -> {
                            if (success)
                                updateStats(channel.getChannelName());
                            return success;
                        })
                        .exceptionally(ex -> {
                            LOGGER.log(Level.WARNING, "Failed to send via " + channel.getChannelName(), ex);
                            return false;
                        }))
                .collect(Collectors.toList());

        return CompletableFuture.allOf(channelFutures.toArray(new CompletableFuture[0]));
    }

    private void updateStats(String channelName) {
        deliveryStats.merge(channelName, 1, Integer::sum);
    }

    private void printStats() {
        System.out.println("\n=== Delivery Statistics ===");
        deliveryStats.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(entry -> System.out.printf("  %s: %d messages%n", entry.getKey(), entry.getValue()));
    }

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

    public static AdvancedNotificationService createDefault() {
        return new AdvancedNotificationService(Arrays.asList(
                new EmailChannel(),
                new SmsChannel(),
                new PushChannel()));
    }

    public static void main(String[] args) {
        System.out.println("=== Advanced Java Notification Service ===\n");

        AdvancedNotificationService service = AdvancedNotificationService.createDefault();

        try {
            List<NotificationMessage> sampleMessages = Arrays.asList(
                    new NotificationMessage(
                            "youths.powerhouse@gmail.com",
                            "System Alert",
                            "Server load at 85%",
                            Priority.URGENT),
                    new NotificationMessage(
                            "user@example.com",
                            "Reminder",
                            "Your choir rehearsal is starting soon",
                            Priority.MEDIUM),
                    new NotificationMessage(
                            "member@church.com",
                            "Newsletter",
                            "Monthly newsletter is available",
                            Priority.LOW));

            sampleMessages.forEach(service::queueMessage);
            service.processQueue();

        } finally {
            service.shutdown();
        }

        System.out.println("\n✓ Service shutdown complete");
    }
}
