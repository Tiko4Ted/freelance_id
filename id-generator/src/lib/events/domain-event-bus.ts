export type ApplicationSubmittedEvent = {
  type: "application.submitted";
  payload: {
    applicationId: string;
    legalName: string;
    email: string;
  };
};

export type DomainEvent = ApplicationSubmittedEvent;

type DomainEventHandler<TEvent extends DomainEvent> = (
  event: TEvent,
) => Promise<void>;

export interface DomainEventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent>(
    eventType: TEvent["type"],
    handler: DomainEventHandler<TEvent>,
  ): void;
}

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<
    DomainEvent["type"],
    DomainEventHandler<DomainEvent>[]
  >();

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  subscribe<TEvent extends DomainEvent>(
    eventType: TEvent["type"],
    handler: DomainEventHandler<TEvent>,
  ): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler as DomainEventHandler<DomainEvent>);
    this.handlers.set(eventType, handlers);
  }
}
