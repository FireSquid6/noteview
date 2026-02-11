# Mermaid UML Diagrams

Mermaid supports several UML diagram types directly in markdown.

## Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +String breed
        +fetch() void
        +makeSound() void
    }
    class Cat {
        +bool isIndoor
        +purr() void
        +makeSound() void
    }
    class Shelter {
        -List~Animal~ animals
        +adopt(Animal a) bool
        +intake(Animal a) void
        +getCount() int
    }

    Animal <|-- Dog
    Animal <|-- Cat
    Shelter "1" o-- "*" Animal : houses
```

## Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant Server
    participant DB

    User ->> Client: Click "Login"
    Client ->> Server: POST /auth/login
    activate Server
    Server ->> DB: SELECT user WHERE email = ?
    DB -->> Server: User record
    alt Valid credentials
        Server -->> Client: 200 OK + JWT
        Client -->> User: Show dashboard
    else Invalid credentials
        Server -->> Client: 401 Unauthorized
        Client -->> User: Show error message
    end
    deactivate Server
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review : submit()
    Review --> Approved : approve()
    Review --> Draft : requestChanges()
    Approved --> Published : publish()
    Published --> Archived : archive()
    Archived --> [*]

    state Review {
        [*] --> Pending
        Pending --> InProgress : assignReviewer()
        InProgress --> Pending : reassign()
        InProgress --> [*] : complete()
    }
```

## Activity Diagram (Flowchart)

```mermaid
flowchart TD
    A([Start]) --> B{Authenticated?}
    B -- Yes --> C[Load Dashboard]
    B -- No --> D[Show Login Page]
    D --> E[/Enter Credentials/]
    E --> F{Valid?}
    F -- Yes --> C
    F -- No --> G[Show Error]
    G --> D
    C --> H{Select Action}
    H --> I[View Reports]
    H --> J[Edit Profile]
    H --> K[Manage Users]
    I --> L([End])
    J --> L
    K --> L
```

## ER Diagram

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        int id PK
        string name
        string email UK
    }
    ORDER ||--|{ LINE_ITEM : contains
    ORDER {
        int id PK
        date created_at
        string status
    }
    LINE_ITEM }o--|| PRODUCT : references
    LINE_ITEM {
        int quantity
        float price
    }
    PRODUCT {
        int id PK
        string name
        float base_price
        string category
    }
```
