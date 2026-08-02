export type ApplicationSubmittedEvent = {
  type: "application.submitted";
  payload: {
    applicationId: string;
    legalName: string;
    email: string;
  };
};

export type ApplicationRejectedEvent = {
  type: "application.rejected";
  payload: {
    applicationId: string;
    legalName: string;
    email: string;
    rejectionReason: string;
    reapplyCooldownUntil: Date;
  };
};

export type ApplicationApprovedEvent = {
  type: "application.approved";
  payload: {
    applicationId: string;
    legalName: string;
    email: string;
    freelanceIdCode: string;
    serialNumber: string;
    cardToken: string;
  };
};

export type DomainEvent =
  | ApplicationSubmittedEvent
  | ApplicationRejectedEvent
  | ApplicationApprovedEvent;
type DomainEventType = DomainEvent["type"];
type DomainEventForType<TType extends DomainEventType> = Extract<
  DomainEvent,
  { type: TType }
>;

type DomainEventHandler<TType extends DomainEventType> = (
  event: DomainEventForType<TType>,
) => Promise<void>;

export interface DomainEventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
  subscribe<TType extends DomainEventType>(
    eventType: TType,
    handler: DomainEventHandler<TType>,
  ): void;
}

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<
    DomainEventType,
    ((event: DomainEvent) => Promise<void>)[]
  >();

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  subscribe<TType extends DomainEventType>(
    eventType: TType,
    handler: DomainEventHandler<TType>,
  ): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventType, handlers);
  }
}
