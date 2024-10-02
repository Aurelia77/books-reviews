import BookInfos from "@/components/BookInfos";
import Title from "@/components/Title";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getDocsByQueryFirebase } from "@/firebase";
import { friendsWhoReadBook } from "@/lib/utils";
//import { books } from "@/data";
import { BookType } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { ClipLoader } from "react-spinners";
import useSWR from "swr";
import { z } from "zod";

const MAX_RESULTS = 5; // jusqu'à 40

type BookAPIType = {
  id: string;
  volumeInfo: {
    title: string;
    authors: string[];
    imageLinks: {
      thumbnail: string;
      smallThumbnail: string;
    };
    language: string;
    description: string;
    categories: string[];
    pageCount: number;
    publishedDate: string;
    publisher: string;
  };
};

type SearchBooksFormType = {
  bookTitle: string;
  bookAuthors: string;
  bookStatus: BookStatusEnum;
};

enum BookStatusEnum {
  read = "read",
  inProgress = "inProgress",
  toRead = "toRead",
}

const bookFormSchema = z
  .object({
    bookTitle: z.string().optional(),
    bookAuthors: z.string().optional(),
    bookStatus: z.nativeEnum(BookStatusEnum),
  })
  .refine((data) => data.bookTitle || data.bookAuthors, {
    message: "Entrez un titre ou un auteur.",
    path: ["bookTitle"],
  });

const BooksSearchPage = (): JSX.Element => {
  const [databaseBooks, setDatabaseBooks] = useState<BookType[]>([]);
  //console.log("books from BDD", databaseBooks);
  const [allSearchBooks, setAllSearchBooks] = useState<BookType[]>([]);
  //console.log("books from BDD and API", allSearchBooks);

  // FORMULAIRE (hook perso ?)
  const form = useForm<SearchBooksFormType>({
    resolver: zodResolver(bookFormSchema),
    // Tjs mettre des valeurs par défaut sinon ERREUR : Warning: A component is changing an uncontrolled input to be controlled
    defaultValues: {
      bookTitle: "",
      bookAuthors: "",
      bookStatus: BookStatusEnum.read,
    },
  });

  const title = form.watch("bookTitle");
  const author = form.watch("bookAuthors");

  const onSubmit: SubmitHandler<SearchBooksFormType> = (formData) =>
    console.log(formData);

  // APPEL API (hook perso ?)
  const [booksApiUrl, setBooksApiUrl] = useState(
    `https://www.googleapis.com/books/v1/volumes?q=subject:general&maxResults=${MAX_RESULTS}`
  );

  const shuffle2ArraysPreserveOrder = <T, U>(
    array1: T[],
    array2: U[]
  ): (T | U)[] => {
    const combinedArray = [
      ...array1.map((item) => ({ item, from: "array1" })),
      ...array2.map((item) => ({ item, from: "array2" })),
    ];

    // Mélanger le tableau combiné
    for (let i = combinedArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combinedArray[i], combinedArray[j]] = [
        combinedArray[j],
        combinedArray[i],
      ];
    }

    // Extraire les éléments mélangés tout en conservant l'ordre relatif
    const shuffledArray: (T | U)[] = [];
    let array1Index = 0;
    let array2Index = 0;

    for (const element of combinedArray) {
      if (element.from === "array1") {
        shuffledArray.push(array1[array1Index++]);
      } else {
        shuffledArray.push(array2[array2Index++]);
      }
    }

    return shuffledArray;
  };

  const fetchAPIBooks = (booksApiUrl: string): Promise<BookType[]> => {
    // throw new Error(
    //   "Erreur simulée lors de la récupération des informations du livre"
    // );
    return (
      fetch(booksApiUrl)
        .then((res: Response): Promise<{ items: BookAPIType[] }> => res.json())
        //.then((res) => res.json())    // idem sans TS
        .then((data) => data.items)
        .then((items) => {
          const booksFromAPI: BookType[] = items.map((book: BookAPIType) => {
            return {
              bookId: book.id,
              bookTitle: book.volumeInfo.title,
              bookAuthor: book.volumeInfo?.authors?.[0] ?? "Auteur inconnu",
              bookDescription: book.volumeInfo.description,
              bookCategories: book.volumeInfo.categories,
              bookPageCount: book.volumeInfo.pageCount,
              bookPublishedDate: book.volumeInfo.publishedDate,
              bookPublisher: book.volumeInfo.publisher,
              bookImageLink: book.volumeInfo.imageLinks?.thumbnail,
              bookLanguage: book.volumeInfo.language,
              bookIsFromAPI: true,
            };
          });
          return booksFromAPI;
        })
        .catch((error) => {
          console.error("Error fetching books:", error);
          return [];
        })
    );
  };

  const {
    data: apiBooks,
    error,
    isLoading,
  } = useSWR<BookType[]>(booksApiUrl, fetchAPIBooks);

  //console.log("booksFromAPI", apiBooks);

  const getRandomChar = (): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const randomIndex = Math.floor(Math.random() * chars.length);
    return chars[randomIndex];
  };

  useEffect(() => {
    const fetchBooks = async () => {
      const books = await getDocsByQueryFirebase(
        "books",
        "bookIsFromAPI",
        true
      );
      setDatabaseBooks(books);
    };

    fetchBooks();
  }, []);

  // useEffect(() => {
  //   if (!title) {
  //     setSearchUrl(
  //       //`https://www.googleapis.com/books/v1/volumes?q=subject:general&maxResults=${MAX_RESULTS}` => Tous les livres, mais toujours les mêmes résultats (même ordre)
  //       `https://www.googleapis.com/books/v1/volumes?q=${getRandomChar()}&maxResults=${MAX_RESULTS}`
  //     );
  //     setBooksFromBDD(books);
  //   } else {
  //     setSearchUrl(
  //       `https://www.googleapis.com/books/v1/volumes?q=${title}&maxResults=${MAX_RESULTS}`
  //     );
  //     setBooksFromBDD(
  //       books.filter((book) =>
  //         book.title.toLowerCase().includes(title.toLowerCase())
  //       )
  //     );
  //   }
  // }, [title]);

  useEffect(() => {
    //if (!title) {
    if (!title && !author) {
      setBooksApiUrl(
        //`https://www.googleapis.com/books/v1/volumes?q=subject:general&maxResults=${MAX_RESULTS}` => Tous les livres, mais toujours les mêmes résultats (même ordre)
        // On rechercher des livres aléatoires en fonction d'un caractère aléatoire
        `https://www.googleapis.com/books/v1/volumes?q=${getRandomChar()}&maxResults=${MAX_RESULTS}`
      );

      const fetchBooks = () => {
        getDocsByQueryFirebase("books", "bookIsFromAPI", true)
          .then((books) => {
            //console.log("books from BDD", books);
            setDatabaseBooks(books);
          })
          .catch((error) => {
            console.error("Error fetching books: ", error);
          });
      };

      fetchBooks();
    } else {
      // let query = "";
      // if (title) {
      //   query += `${encodeURIComponent(title)}`;
      // }
      // if (author) {
      //   if (query) query += "+";
      //   query += `inauthor:${author}`;
      // }
      // console.log("**query", query);
      // setSearchUrl(
      //   `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${MAX_RESULTS}`
      // );

      setBooksApiUrl(
        `https://www.googleapis.com/books/v1/volumes?q=${title}&maxResults=${MAX_RESULTS}`
      );
      setDatabaseBooks(
        databaseBooks.filter((book: BookType) =>
          book.bookTitle.toLowerCase().includes(title.toLowerCase())
        )
      );
    }
    // `https://www.googleapis.com/books/v1/volumes?q=${title}+inauthor:${author}&maxResults=${MAX_RESULTS}`;
  }, [title]);

  useEffect(() => {
    if (apiBooks) {
      ////////////////////////// TEST
      const twoCats = apiBooks.filter(
        (book) => book.bookCategories?.[1] !== undefined
      );
      console.log("twoCats", twoCats);
      /////////////////////////////////
      setAllSearchBooks(shuffle2ArraysPreserveOrder(databaseBooks, apiBooks));
    }
  }, [apiBooks, databaseBooks]);

  const formRef = useRef<HTMLFormElement>(null);

  // Au montage du composant, on ajoute un écouteur d'événement sur la fenêtre pour gérer le scroll
  useEffect(() => {
    // console.log("useEffect");
    const handleScroll = () => {
      if (formRef.current) {
        // console.log("formRef.current", formRef.current.offsetHeight);
        // console.log("formRef.current", formRef.current.offsetTop);
        // console.log("window.scrollY", window.scrollY);
        if (window.scrollY > formRef.current.offsetHeight) {
          formRef.current.classList.add("form-sticky-active");
          formRef.current.querySelectorAll("*").forEach((child) => {
            child.classList.add("form-sticky-active");
          });
          // console.log("ADD CLASS");
        } else {
          formRef.current.classList.remove("form-sticky-active");
          formRef.current.querySelectorAll("*").forEach((child) => {
            child.classList.remove("form-sticky-active");
          });
          // console.log("REMOVE CLASS");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="h-full sm:p-2">
      <div className="flex h-full flex-col gap-6">
        <Form {...form}>
          <form
            ref={formRef}
            className="sticky top-10 z-10 flex flex-col gap-3 bg-background/70 duration-500"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <Title>Recherche de livre</Title>
            <FormField
              control={form.control}
              name="bookTitle"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Titre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bookAuthors"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Auteur(e)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        {/* <RadioGroup defaultValue={BookStatusEnum.read}>
              <Controller
                name="bookStatus"
                control={form.control}
                defaultValue={BookStatusEnum.read}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={BookStatusEnum.read} id="read" />
                      <Label htmlFor="read">Lu</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={BookStatusEnum.inProgress}
                        id="inProgress"
                      />
                      <Label htmlFor="inProgress">En cours</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={BookStatusEnum.toRead}
                        id="toRead"
                      />
                      <Label htmlFor="toRead">À lire</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </RadioGroup> */}
        {/* <Button type="submit">Ajouter</Button> */}
        {/* <Search className="text-primary/60 drop-shadow-lg" size={40} /> */}
        {/*  */}
        {isLoading ? (
          <ClipLoader
            className="m-auto mt-16"
            color="#09f"
            loading={isLoading}
            size={70}
          />
        ) : (
          <div className="mb-40">
            {error && (
              <p className="p-3 text-destructive-foreground">
                Un problème est survenu lors de la recherche de livres :{" "}
                {error.message}
              </p>
            )}
            <ul>
              {allSearchBooks &&
                allSearchBooks.map((book: BookType) => (
                  <li key={book.bookId}>
                    <BookInfos
                      book={book}
                      friendsWhoReadBook={friendsWhoReadBook(book.bookId)}
                    />
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksSearchPage;
