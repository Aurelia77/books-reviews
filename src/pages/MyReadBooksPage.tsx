import BookInfos from "@/components/BookInfos";
import BookSkeleton from "@/components/BookSkeleton";
import CustomLinkButton from "@/components/CustomLinkButton";
import FeedbackMessage from "@/components/FeedbackMessage";
import Title from "@/components/Title";
import { getDocsByQueryFirebase } from "@/firebase";
import useUserStore from "@/hooks/useUserStore";
import { UserType } from "@/types";
import useSWR from "swr";

const MyReadBooksPage = (): JSX.Element => {
  const { user } = useUserStore();
  const fetcher = (userId: string | null) => {
    if (userId)
      return getDocsByQueryFirebase<UserType>("users", "id", userId).then(
        (users) => {
          console.log("USERS", users);
          return users[0].booksRead;
        }
        //setMyReadBooksIds(users[0].booksRead)
      );
    //si userId est null, on retourne une promesse vide
    return Promise.resolve([]);
    //   getDocsByQueryFirebase("books", "bookId", bookId).then((books) => {
    //   setMyReadBooks((prevBooks) => [...prevBooks, ...books]);
    // });
  };

  const {
    data: myReadBooksIds,
    error,
    isLoading,
  } = useSWR<string[]>(user ? user.uid : null, fetcher);

  console.log("isLoading", isLoading);
  console.log("myReadBooksIds", myReadBooksIds);

  const message = `Un problème est survenu dans la récupération de vos livres lus => ${error?.message}`;

  return (
    <div className="h-full min-h-screen">
      <Title>Mes livres lus</Title>

      {isLoading ? (
        <div>
          <BookSkeleton />
          <BookSkeleton />
          <BookSkeleton />
        </div>
      ) : error ? (
        <FeedbackMessage message={message} type="error" />
      ) : myReadBooksIds ? (
        myReadBooksIds.length > 0 ? (
          <ul className="flex h-full flex-col pb-16">
            {myReadBooksIds.map(
              (bookId) =>
                bookId && (
                  // Ici on passe le bookId en props (et pas le book complet comme dans BooksSearchPage)
                  <BookInfos
                    key={bookId}
                    bookId={bookId}
                    //friendsWhoReadBook={["Loulou"]}
                  />
                )
            )}
          </ul>
        ) : (
          <div>
            <FeedbackMessage message="Aucun livre pour l'instant" />
            <div className="flex flex-col gap-4 py-12">
              <p className="ml-1">Essayez d'aller par là !</p>
              <CustomLinkButton
                className="bg-accent/60"
                linkTo="/mybooks/searchbook"
              >
                Recherche de livre
              </CustomLinkButton>
              <CustomLinkButton className="bg-secondary/80">
                Livres de mes amis
              </CustomLinkButton>
              <CustomLinkButton className="bg-primary/50">
                Suggestions
              </CustomLinkButton>
              {/* <FeedbackMessage
            message="Vous n'avez pas encore lu de livre."
            type="error"
          /> */}
            </div>
          </div>
        )
      ) : (
        ""
      )}
    </div>
  );
};

export default MyReadBooksPage;
